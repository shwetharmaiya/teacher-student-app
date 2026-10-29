import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import bcrypt from "bcrypt";
import pg from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isDedicatedTestDatabase = Boolean(testDatabaseUrl && /test/i.test(new URL(testDatabaseUrl).pathname));
const fixtureIds = {
    admin: randomUUID(), teacher: randomUUID(), otherTeacher: randomUUID(),
    student: randomUUID(), otherStudent: randomUUID(), parent: randomUUID(),
};
const classIds = { assigned: randomUUID(), other: randomUUID(), capacity: randomUUID() };
const assignmentId = randomUUID();
const password = "Phase7-test-password";
const emailPrefix = `phase7-${randomUUID()}`;
let pool;
let appServer;
let baseUrl;
let tokens = {};
let seeded = false;

if (isDedicatedTestDatabase && testDatabaseUrl) {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET ??= "phase7-integration-test-secret-0123456789";
    process.env.FRONTEND_URL ??= "http://localhost:5173";
    process.env.NODE_ENV = "test";
}

before(async () => {
    if (!isDedicatedTestDatabase || !testDatabaseUrl) return;
    pool = new pg.Pool({ connectionString: testDatabaseUrl });
    await pool.query("select 1");
    const passwordHash = await bcrypt.hash(password, 4);
    const people = [
        [fixtureIds.admin, `${emailPrefix}-admin@example.test`, "ADMIN"],
        [fixtureIds.teacher, `${emailPrefix}-teacher@example.test`, "TEACHER"],
        [fixtureIds.otherTeacher, `${emailPrefix}-teacher2@example.test`, "TEACHER"],
        [fixtureIds.student, `${emailPrefix}-student@example.test`, "STUDENT"],
        [fixtureIds.otherStudent, `${emailPrefix}-student2@example.test`, "STUDENT"],
        [fixtureIds.parent, `${emailPrefix}-parent@example.test`, "PARENT"],
    ];
    for (const [id, email, role] of people) {
        await pool.query("insert into users (id, email, password_hash, role) values ($1, $2, $3, $4)", [id, email, passwordHash, role]);
    }
    const grade = `QA-${randomUUID().slice(0, 8)}`;
    await pool.query("insert into classes (id, grade, section, teacher_id, room, capacity) values ($1, $2, 'A', $3, 'T1', 2), ($4, $2, 'B', $5, 'T2', 2), ($6, $2, 'C', $3, 'T3', 1)", [classIds.assigned, grade, fixtureIds.teacher, classIds.other, fixtureIds.otherTeacher, classIds.capacity]);
    await pool.query("insert into class_enrollments (class_id, student_id) values ($1, $2), ($3, $4)", [classIds.assigned, fixtureIds.student, classIds.capacity, fixtureIds.otherStudent]);
    await pool.query("insert into parent_student_links (parent_id, student_id, verified_by) values ($1, $2, $3)", [fixtureIds.parent, fixtureIds.student, fixtureIds.admin]);
    await pool.query("insert into assignments (id, class_id, teacher_id, title, description, due_at) values ($1, $2, $3, 'Integration assignment', 'Testing scope', now() + interval '1 day')", [assignmentId, classIds.assigned, fixtureIds.teacher]);
    seeded = true;

    const { createApp } = await import("../dist/app.js");
    appServer = createApp().listen(0);
    await once(appServer, "listening");
    const address = appServer.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    const roleAccounts = { admin: people[0], teacher: people[1], otherTeacher: people[2], student: people[3], otherStudent: people[4], parent: people[5] };
    for (const [key, [, email]] of Object.entries(roleAccounts)) {
        const response = await request("/api/auth/login", { method: "POST", body: { email, password } });
        assert.equal(response.status, 200, `test fixture login for ${key} failed`);
        tokens[key] = response.body.token;
    }
});

after(async () => {
    if (appServer) await new Promise((resolve, reject) => appServer.close((error) => error ? reject(error) : resolve()));
    if (pool) {
        if (seeded) {
            await pool.query("delete from audit_logs where actor_id = any($1::uuid[]) or (entity_type = 'CLASS' and entity_id = any($2::uuid[]))", [Object.values(fixtureIds), Object.values(classIds)]);
            await pool.query("delete from classes where id = any($1::uuid[])", [Object.values(classIds)]);
            await pool.query("delete from users where id = any($1::uuid[])", [Object.values(fixtureIds)]);
        }
        await pool.end();
    }
    if (isDedicatedTestDatabase) {
        const { pool: appPool } = await import("../dist/db/index.js");
        await appPool.end();
    }
});

async function request(path, { method = "GET", token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const parsed = await response.json().catch(() => null);
    return { status: response.status, body: parsed, headers: response.headers };
}

test("Phase 7 API integration checks", { skip: !isDedicatedTestDatabase && "Set TEST_DATABASE_URL to a dedicated migrated PostgreSQL database whose name includes 'test'" }, async (t) => {
    await t.test("login succeeds safely, invalid credentials fail, and public registration is disabled", async () => {
        const email = `${emailPrefix}-student@example.test`;
        const success = await request("/api/auth/login", { method: "POST", body: { email, password } });
        assert.equal(success.status, 200);
        assert.equal(success.body.user.role, "STUDENT");
        assert.equal("passwordHash" in success.body.user, false);
        const failure = await request("/api/auth/login", { method: "POST", body: { email, password: "wrong" } });
        assert.equal(failure.status, 401);
        assert.equal((await request("/api/auth/register", { method: "POST", body: {} })).status, 403);
    });

    await t.test("session resolution always returns JSON even with a conditional cache header", async () => {
        const response = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${tokens.teacher}`, "If-None-Match": '"previous-session-etag"' },
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).user.role, "TEACHER");
    });

    await t.test("role denial is enforced by the API", async () => {
        const response = await request("/api/classes", { token: tokens.student });
        assert.equal(response.status, 403);
    });

    await t.test("teacher class ownership blocks access to another teacher's class", async () => {
        const response = await request(`/api/teacher/classes/${classIds.assigned}`, { token: tokens.otherTeacher });
        assert.equal(response.status, 403);
    });

    await t.test("enrollment enforces student roles, duplicates, and class capacity", async () => {
        const teacherEnrollment = await request(`/api/classes/${classIds.assigned}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.teacher } });
        assert.equal(teacherEnrollment.status, 400);
        const duplicate = await request(`/api/classes/${classIds.assigned}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.student } });
        assert.equal(duplicate.status, 409);
        const full = await request(`/api/classes/${classIds.capacity}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.student } });
        assert.equal(full.status, 409);
    });

    await t.test("attendance verifies teacher assignment and student enrollment", async () => {
        const denied = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.otherTeacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.student, status: "PRESENT" }] } });
        assert.equal(denied.status, 403);
        const notEnrolled = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.teacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.otherStudent, status: "PRESENT" }] } });
        assert.equal(notEnrolled.status, 409);
        const saved = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.teacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.student, status: "PRESENT" }] } });
        assert.equal(saved.status, 200);
    });

    await t.test("assignment creation, reads, and parent data are scoped to ownership and enrollment", async () => {
        const wrongOwner = await request("/api/teacher/assignments", { method: "POST", token: tokens.otherTeacher, body: { classId: classIds.assigned, title: "Unauthorized", dueAt: "2027-01-01T00:00:00.000Z" } });
        assert.equal(wrongOwner.status, 403);
        const ownList = await request("/api/student/assignments", { token: tokens.student });
        assert.equal(ownList.status, 200);
        assert.ok(ownList.body.assignments.some((assignment) => assignment.id === assignmentId));
        const submission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "Scoped integration-test work" } });
        assert.equal(submission.status, 201);
        const outsiderSubmission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.otherStudent, body: { content: "Must not be accepted" } });
        assert.equal(outsiderSubmission.status, 404);
        const outsiderDetail = await request(`/api/student/assignments/${assignmentId}`, { token: tokens.otherStudent });
        assert.equal(outsiderDetail.status, 404);
        const linkedParent = await request(`/api/parent/assignments?childId=${fixtureIds.student}`, { token: tokens.parent });
        assert.equal(linkedParent.status, 200);
        const children = await request(`/api/parent/children?studentId=${fixtureIds.otherStudent}`, { token: tokens.parent });
        assert.equal(children.status, 200);
        assert.deepEqual(children.body.children.map((child) => child.id), [fixtureIds.student]);
        const unlinkedParent = await request(`/api/parent/assignments?childId=${fixtureIds.otherStudent}`, { token: tokens.parent });
        assert.equal(unlinkedParent.status, 404);
    });

    await t.test("unexpected routes return a consistent request ID", async () => {
        const response = await request("/api/not-a-route", { token: tokens.admin });
        assert.equal(response.status, 404);
        assert.equal(response.body.message, "Route not found");
        assert.ok(response.headers.get("x-request-id"));
    });

    await t.test("CORS allows only configured frontend origins", async () => {
        const allowed = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "http://localhost:5173" } });
        assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
        const denied = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://untrusted.example.test" } });
        assert.equal(denied.headers.get("access-control-allow-origin"), null);
        assert.equal(denied.headers.get("x-content-type-options"), "nosniff");
    });

    await t.test("authentication requests are rate limited", async () => {
        let last;
        for (let attempt = 0; attempt < 13; attempt += 1) {
            last = await request("/api/auth/login", { method: "POST", body: { email: `${emailPrefix}-not-found@example.test`, password: "invalid" } });
            if (attempt < 12) assert.equal(last.status, 401);
        }
        assert.equal(last.status, 429);
        assert.ok(last.headers.get("retry-after"));
    });
});
