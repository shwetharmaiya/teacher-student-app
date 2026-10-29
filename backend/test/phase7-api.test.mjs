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
const lateAssignmentId = randomUUID();
const password = "Phase7-test-password";
const emailPrefix = `phase7-${randomUUID()}`;
const extraUserIds = [];
const extraClassIds = [];
const extraSubjectIds = [];
let pool;
let appServer;
let baseUrl;
let tokens = {};
let seeded = false;
let submissionId;

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
    const migrated = await pool.query("select to_regclass('public.users') as users, to_regclass('public.audit_logs') as audit_logs");
    if (!migrated.rows[0].users || !migrated.rows[0].audit_logs) throw new Error("TEST_DATABASE_URL must point to a database with all application migrations applied");
    seeded = true;
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
    await pool.query("insert into assignments (id, class_id, teacher_id, title, description, due_at) values ($1, $2, $3, 'Late integration assignment', 'Late work remains allowed', now() - interval '1 day')", [lateAssignmentId, classIds.assigned, fixtureIds.teacher]);
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
            if (extraClassIds.length) await pool.query("delete from audit_logs where entity_id = any($1::uuid[])", [extraClassIds]);
            if (extraSubjectIds.length) await pool.query("delete from subjects where id = any($1::uuid[])", [extraSubjectIds]);
            if (extraClassIds.length) await pool.query("delete from classes where id = any($1::uuid[])", [extraClassIds]);
            await pool.query("delete from classes where id = any($1::uuid[])", [Object.values(classIds)]);
            await pool.query("delete from users where id = any($1::uuid[])", [[...Object.values(fixtureIds), ...extraUserIds]]);
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

    await t.test("Phase 2: admin user CRUD validates roles, hashes passwords, and omits secrets", async () => {
        const invalidRole = await request("/api/admin/users", { method: "POST", token: tokens.admin, body: { email: `${emailPrefix}-invalid@example.test`, password: "valid-password", role: "SUPERADMIN" } });
        assert.equal(invalidRole.status, 400);
        const email = `${emailPrefix}-managed@example.test`;
        const created = await request("/api/admin/users", { method: "POST", token: tokens.admin, body: { email, password: "managed-password", role: "STUDENT" } });
        assert.equal(created.status, 201);
        assert.equal("passwordHash" in created.body.user, false);
        extraUserIds.push(created.body.user.id);
        const stored = await pool.query("select password_hash from users where id = $1", [created.body.user.id]);
        assert.notEqual(stored.rows[0].password_hash, "managed-password");
        const duplicate = await request("/api/admin/users", { method: "POST", token: tokens.admin, body: { email, password: "other-password", role: "STUDENT" } });
        assert.equal(duplicate.status, 409);
        const updated = await request(`/api/admin/users/${created.body.user.id}`, { method: "PUT", token: tokens.admin, body: { email: `${emailPrefix}-managed-updated@example.test` } });
        assert.equal(updated.status, 200);
        assert.equal("passwordHash" in updated.body.user, false);
        const listed = await request(`/api/admin/users?search=${emailPrefix}&page=1&limit=2`, { token: tokens.admin });
        assert.equal(listed.status, 200);
        assert.equal(listed.body.limit, 2);
        assert.ok(listed.body.users.every((user) => !("passwordHash" in user)));
        const deleted = await request(`/api/admin/users/${created.body.user.id}`, { method: "DELETE", token: tokens.admin });
        assert.equal(deleted.status, 204);
    });

    await t.test("Phase 2: subject and teaching-assignment CRUD enforce teacher roles", async () => {
        const subject = await request("/api/subjects", { method: "POST", token: tokens.admin, body: { name: "Integration Science", code: `${emailPrefix.slice(-8)}-SCI` } });
        assert.equal(subject.status, 201);
        extraSubjectIds.push(subject.body.subject.id);
        const duplicate = await request("/api/subjects", { method: "POST", token: tokens.admin, body: { name: "Duplicate", code: subject.body.subject.code } });
        assert.equal(duplicate.status, 409);
        const wrongRole = await request("/api/subjects/assignments", { method: "POST", token: tokens.admin, body: { teacherId: fixtureIds.student, classId: classIds.assigned, subjectId: subject.body.subject.id } });
        assert.equal(wrongRole.status, 400);
        const assignment = await request("/api/subjects/assignments", { method: "POST", token: tokens.admin, body: { teacherId: fixtureIds.teacher, classId: classIds.assigned, subjectId: subject.body.subject.id } });
        assert.equal(assignment.status, 201);
        const ownTeaching = await request("/api/subjects/my-assignments", { token: tokens.teacher });
        assert.ok(ownTeaching.body.assignments.some((item) => item.id === assignment.body.assignment.id));
        const removedAssignment = await request(`/api/subjects/assignments/${assignment.body.assignment.id}`, { method: "DELETE", token: tokens.admin });
        assert.equal(removedAssignment.status, 204);
        const removedSubject = await request(`/api/subjects/${subject.body.subject.id}`, { method: "DELETE", token: tokens.admin });
        assert.equal(removedSubject.status, 204);
    });

    await t.test("Phase 2: class creation checks teacher roles and enrollment workflow supports add/remove", async () => {
        const invalidClass = await request("/api/classes", { method: "POST", token: tokens.admin, body: { grade: `Invalid-${randomUUID().slice(0, 6)}`, section: "A", teacherId: fixtureIds.student, room: "T9", capacity: 5 } });
        assert.equal(invalidClass.status, 400);
        const createdClass = await request("/api/classes", { method: "POST", token: tokens.admin, body: { grade: `Extra-${randomUUID().slice(0, 6)}`, section: "A", teacherId: fixtureIds.teacher, room: "T9", capacity: 1 } });
        assert.equal(createdClass.status, 201);
        extraClassIds.push(createdClass.body.class.id);
        const enrolled = await request("/api/class-enrollments", { method: "POST", token: tokens.admin, body: { classId: createdClass.body.class.id, studentId: fixtureIds.otherStudent } });
        assert.equal(enrolled.status, 201);
        const removed = await request(`/api/classes/${createdClass.body.class.id}/enrollments/${fixtureIds.otherStudent}`, { method: "DELETE", token: tokens.admin });
        assert.equal(removed.status, 204);
    });

    await t.test("Phase 4: admin links only valid parent/student roles and can revoke the link", async () => {
        const wrongParentRole = await request("/api/admin/parent-links", { method: "POST", token: tokens.admin, body: { parentId: fixtureIds.teacher, studentId: fixtureIds.otherStudent } });
        assert.equal(wrongParentRole.status, 400);
        const wrongStudentRole = await request("/api/admin/parent-links", { method: "POST", token: tokens.admin, body: { parentId: fixtureIds.parent, studentId: fixtureIds.teacher } });
        assert.equal(wrongStudentRole.status, 400);
        const linked = await request("/api/admin/parent-links", { method: "POST", token: tokens.admin, body: { parentId: fixtureIds.parent, studentId: fixtureIds.otherStudent } });
        assert.equal(linked.status, 201);
        const duplicate = await request("/api/admin/parent-links", { method: "POST", token: tokens.admin, body: { parentId: fixtureIds.parent, studentId: fixtureIds.otherStudent } });
        assert.equal(duplicate.status, 409);
        const links = await request("/api/admin/parent-links", { token: tokens.admin });
        assert.ok(links.body.links.some((link) => link.id === linked.body.link.id && link.verifiedBy === fixtureIds.admin));
        const revoked = await request(`/api/admin/parent-links/${linked.body.link.id}`, { method: "DELETE", token: tokens.admin });
        assert.equal(revoked.status, 204);
        const revokedAccess = await request(`/api/parent/assignments?childId=${fixtureIds.otherStudent}`, { token: tokens.parent });
        assert.equal(revokedAccess.status, 404);
    });

    await t.test("role denial is enforced by the API", async () => {
        const response = await request("/api/classes", { token: tokens.student });
        assert.equal(response.status, 403);
    });

    await t.test("teacher class ownership blocks access to another teacher's class", async () => {
        const response = await request(`/api/teacher/classes/${classIds.assigned}`, { token: tokens.otherTeacher });
        assert.equal(response.status, 403);
        const teacherOwnRoster = await request(`/api/teacher/classes/${classIds.assigned}?date=2026-01-15`, { token: tokens.teacher });
        assert.equal(teacherOwnRoster.status, 200);
        assert.equal(teacherOwnRoster.body.class.students, 1);
        assert.equal(teacherOwnRoster.body.students.length, 1);
        const teacherStudents = await request("/api/teacher/students", { token: tokens.teacher });
        assert.equal(teacherStudents.status, 200);
        assert.ok(teacherStudents.body.students.some((student) => student.studentId === fixtureIds.student && student.classId === classIds.assigned));
        const otherTeacherStudents = await request("/api/teacher/students", { token: tokens.otherTeacher });
        assert.equal(otherTeacherStudents.status, 200);
        assert.ok(!otherTeacherStudents.body.students.some((student) => student.studentId === fixtureIds.student));
    });

    await t.test("enrollment enforces student roles, duplicates, and class capacity", async () => {
        const teacherEnrollment = await request(`/api/classes/${classIds.assigned}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.teacher } });
        assert.equal(teacherEnrollment.status, 400);
        const duplicate = await request(`/api/classes/${classIds.assigned}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.student } });
        assert.equal(duplicate.status, 409);
        const full = await request(`/api/classes/${classIds.capacity}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.student } });
        assert.equal(full.status, 409);
        const success = await request(`/api/classes/${classIds.other}/enrollments`, { method: "POST", token: tokens.admin, body: { studentId: fixtureIds.student } });
        assert.equal(success.status, 201);
        const removed = await request(`/api/classes/${classIds.other}/enrollments/${fixtureIds.student}`, { method: "DELETE", token: tokens.admin });
        assert.equal(removed.status, 204);
    });

    await t.test("attendance verifies teacher assignment and student enrollment", async () => {
        const denied = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.otherTeacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.student, status: "PRESENT" }] } });
        assert.equal(denied.status, 403);
        const notEnrolled = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.teacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.otherStudent, status: "PRESENT" }] } });
        assert.equal(notEnrolled.status, 409);
        const partialBatch = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.teacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.student, status: "PRESENT" }, { studentId: fixtureIds.otherStudent, status: "ABSENT" }] } });
        assert.equal(partialBatch.status, 409);
        const beforeCommit = await pool.query("select count(*)::int as total from attendance_records where class_id = $1 and attendance_date = $2", [classIds.assigned, "2026-01-15"]);
        assert.equal(beforeCommit.rows[0].total, 0);
        const saved = await request(`/api/teacher/classes/${classIds.assigned}/attendance`, { method: "PUT", token: tokens.teacher, body: { attendanceDate: "2026-01-15", entries: [{ studentId: fixtureIds.student, status: "PRESENT" }] } });
        assert.equal(saved.status, 200);
        await pool.query("insert into attendance_records (class_id, student_id, attendance_date, status) values ($1, $2, $3, 'ABSENT')", [classIds.capacity, fixtureIds.otherStudent, "2026-01-15"]);
        const ownAttendance = await request(`/api/student/attendance?studentId=${fixtureIds.otherStudent}`, { token: tokens.student });
        assert.equal(ownAttendance.status, 200);
        assert.equal(ownAttendance.body.summary.recorded, 1);
        assert.equal(ownAttendance.body.records.length, 1);
        assert.ok(ownAttendance.body.records.every((record) => record.classId === classIds.assigned));
        const ownClasses = await request("/api/student/classes", { token: tokens.student });
        assert.ok(ownClasses.body.classes.some((item) => item.id === classIds.assigned));
    });

    await t.test("assignment creation, reads, and parent data are scoped to ownership and enrollment", async () => {
        const wrongOwner = await request("/api/teacher/assignments", { method: "POST", token: tokens.otherTeacher, body: { classId: classIds.assigned, title: "Unauthorized", dueAt: "2027-01-01T00:00:00.000Z" } });
        assert.equal(wrongOwner.status, 403);
        const ownList = await request("/api/student/assignments", { token: tokens.student });
        assert.equal(ownList.status, 200);
        assert.ok(ownList.body.assignments.some((assignment) => assignment.id === assignmentId));
        const invalidId = await request("/api/student/assignments/not-a-uuid", { token: tokens.student });
        assert.equal(invalidId.status, 400);
        const ownDetail = await request(`/api/student/assignments/${assignmentId}`, { token: tokens.student });
        assert.equal(ownDetail.status, 200);
        assert.equal(ownDetail.body.assignment.submission, null);
        const emptySubmission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: " " } });
        assert.equal(emptySubmission.status, 400);
        const tooLong = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "x".repeat(10_001) } });
        assert.equal(tooLong.status, 400);
        const submission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "x".repeat(10_000) } });
        assert.equal(submission.status, 201);
        submissionId = submission.body.submission.id;
        const resubmission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "Revised integration-test work" } });
        assert.equal(resubmission.status, 200);
        assert.equal(resubmission.body.resubmitted, true);
        const updatedDetail = await request(`/api/student/assignments/${assignmentId}`, { token: tokens.student });
        assert.equal(updatedDetail.body.assignment.submission.content, "Revised integration-test work");
        const outsiderSubmission = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.otherStudent, body: { content: "Must not be accepted" } });
        assert.equal(outsiderSubmission.status, 404);
        const outsiderDetail = await request(`/api/student/assignments/${assignmentId}`, { token: tokens.otherStudent });
        assert.equal(outsiderDetail.status, 404);
        const lateSubmission = await request(`/api/student/assignments/${lateAssignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "Late work is still accepted" } });
        assert.equal(lateSubmission.status, 201);
        const linkedParent = await request(`/api/parent/assignments?childId=${fixtureIds.student}`, { token: tokens.parent });
        assert.equal(linkedParent.status, 200);
        const children = await request(`/api/parent/children?studentId=${fixtureIds.otherStudent}`, { token: tokens.parent });
        assert.equal(children.status, 200);
        assert.deepEqual(children.body.children.map((child) => child.id), [fixtureIds.student]);
        const unlinkedParent = await request(`/api/parent/assignments?childId=${fixtureIds.otherStudent}`, { token: tokens.parent });
        assert.equal(unlinkedParent.status, 404);
    });

    await t.test("Phase 5: grading validates ownership, marks, feedback, state transitions, and scoped grade views", async () => {
        const owned = await request(`/api/teacher/assignments/${assignmentId}/submissions`, { token: tokens.teacher });
        assert.equal(owned.status, 200);
        assert.ok(owned.body.submissions.some((item) => item.id === submissionId));
        const notOwned = await request(`/api/teacher/assignments/${assignmentId}/submissions`, { token: tokens.otherTeacher });
        assert.equal(notOwned.status, 404);
        const tooHigh = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "GRADED", marks: 101 } });
        assert.equal(tooHigh.status, 400);
        const tooLongFeedback = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "GRADED", marks: 90, feedback: "f".repeat(2_001) } });
        assert.equal(tooLongFeedback.status, 400);
        const missingReturnFeedback = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "RETURNED", feedback: " " } });
        assert.equal(missingReturnFeedback.status, 400);
        const wrongTeacher = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.otherTeacher, body: { status: "GRADED", marks: 90 } });
        assert.equal(wrongTeacher.status, 403);
        const returned = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "RETURNED", feedback: "Please show your reasoning." } });
        assert.equal(returned.status, 200);
        assert.equal(returned.body.submission.status, "RETURNED");
        const returnedNotices = await request("/api/notifications?unreadOnly=true", { token: tokens.student });
        assert.ok(returnedNotices.body.notifications.some((item) => item.eventType === "SUBMISSION_RETURNED"));
        const resubmitted = await request(`/api/student/assignments/${assignmentId}/submissions`, { method: "POST", token: tokens.student, body: { content: "Revised after feedback" } });
        assert.equal(resubmitted.status, 200);
        const afterResubmission = await request(`/api/student/assignments/${assignmentId}`, { token: tokens.student });
        assert.equal(afterResubmission.body.assignment.submission.status, "SUBMITTED");
        assert.equal(afterResubmission.body.assignment.submission.feedback, null);
        const finalGrade = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "GRADED", marks: 88, feedback: "Clear explanation." } });
        assert.equal(finalGrade.status, 200);
        assert.equal(finalGrade.body.submission.marks, 88);
        const changeFinalGrade = await request(`/api/teacher/submissions/${submissionId}/grade`, { method: "PUT", token: tokens.teacher, body: { status: "GRADED", marks: 90 } });
        assert.equal(changeFinalGrade.status, 409);
        const studentGrades = await request("/api/student/grades", { token: tokens.student });
        assert.ok(studentGrades.body.grades.some((grade) => grade.id === submissionId && grade.marks === 88));
        const parentGrades = await request(`/api/parent/grades?childId=${fixtureIds.student}`, { token: tokens.parent });
        assert.ok(parentGrades.body.grades.some((grade) => grade.id === submissionId && grade.marks === 88));
    });

    await t.test("Phase 6: announcements respect audience visibility and notification ownership", async () => {
        const deniedTeacher = await request("/api/announcements", { method: "POST", token: tokens.otherTeacher, body: { audience: "CLASS", classId: classIds.assigned, title: "Out of scope", body: "Not assigned to this class" } });
        assert.equal(deniedTeacher.status, 403);
        const deniedStudent = await request("/api/announcements", { method: "POST", token: tokens.student, body: { audience: "SCHOOL", title: "Unauthorized", body: "Student cannot publish" } });
        assert.equal(deniedStudent.status, 403);
        const classNotice = await request("/api/announcements", { method: "POST", token: tokens.teacher, body: { audience: "CLASS", classId: classIds.assigned, title: "Class integration notice", body: "Visible to enrolled students and linked parents." } });
        assert.equal(classNotice.status, 201);
        const studentAnnouncements = await request("/api/announcements", { token: tokens.student });
        assert.ok(studentAnnouncements.body.announcements.some((item) => item.id === classNotice.body.announcement.id));
        const unrelatedStudentAnnouncements = await request("/api/announcements", { token: tokens.otherStudent });
        assert.ok(!unrelatedStudentAnnouncements.body.announcements.some((item) => item.id === classNotice.body.announcement.id));
        const parentAnnouncements = await request("/api/announcements", { token: tokens.parent });
        assert.ok(parentAnnouncements.body.announcements.some((item) => item.id === classNotice.body.announcement.id));
        const schoolNotice = await request("/api/announcements", { method: "POST", token: tokens.admin, body: { audience: "SCHOOL", title: "School integration notice", body: "Visible across school." } });
        assert.equal(schoolNotice.status, 201);
        const studentNotices = await request("/api/notifications?unreadOnly=true", { token: tokens.student });
        const announcementNotification = studentNotices.body.notifications.find((item) => item.entityId === classNotice.body.announcement.id);
        assert.ok(announcementNotification);
        const otherUserRead = await request(`/api/notifications/${announcementNotification.id}/read`, { method: "PUT", token: tokens.otherStudent });
        assert.equal(otherUserRead.status, 404);
        const ownRead = await request(`/api/notifications/${announcementNotification.id}/read`, { method: "PUT", token: tokens.student });
        assert.equal(ownRead.status, 200);
        assert.ok(ownRead.body.notification.readAt);
        const markRemainingRead = await request("/api/notifications/read-all", { method: "PUT", token: tokens.student });
        assert.equal(markRemainingRead.status, 200);
    });

    await t.test("Phase 6: report summaries are calculated and scoped by account role", async () => {
        const studentAttendance = await request("/api/reports/attendance?from=2026-01-15&to=2026-01-15", { token: tokens.student });
        assert.equal(studentAttendance.status, 200);
        assert.equal(studentAttendance.body.summary.recorded, 1);
        assert.ok(studentAttendance.body.records.every((item) => item.studentId === fixtureIds.student));
        const studentImpersonation = await request(`/api/reports/attendance?studentId=${fixtureIds.otherStudent}`, { token: tokens.student });
        assert.equal(studentImpersonation.status, 404);
        const teacherAttendance = await request(`/api/reports/attendance?classId=${classIds.assigned}`, { token: tokens.teacher });
        assert.equal(teacherAttendance.body.summary.recorded, 1);
        const teacherForeignClass = await request(`/api/reports/attendance?classId=${classIds.other}`, { token: tokens.teacher });
        assert.equal(teacherForeignClass.status, 404);
        const parentAttendance = await request(`/api/reports/attendance?studentId=${fixtureIds.student}`, { token: tokens.parent });
        assert.equal(parentAttendance.body.summary.recorded, 1);
        const gradeReport = await request(`/api/reports/grades?studentId=${fixtureIds.student}`, { token: tokens.student });
        assert.equal(gradeReport.body.summary.graded, 1);
        assert.equal(gradeReport.body.summary.average, 88);
        const invalidRange = await request("/api/reports/attendance?from=2026-02-01&to=2026-01-01", { token: tokens.admin });
        assert.equal(invalidRange.status, 400);
    });

    await t.test("audit history records account, enrollment, attendance, grading, and announcement events", async () => {
        const result = await pool.query("select distinct action from audit_logs where actor_id = any($1::uuid[])", [Object.values(fixtureIds)]);
        const actions = new Set(result.rows.map((row) => row.action));
        for (const action of ["USER_CREATED", "USER_UPDATED", "USER_DELETED", "STUDENT_ENROLLED", "STUDENT_REMOVED_FROM_CLASS", "ATTENDANCE_ROSTER_SAVED", "SUBMISSION_GRADED", "SUBMISSION_RETURNED", "ANNOUNCEMENT_PUBLISHED"]) {
            assert.ok(actions.has(action), `expected audit event ${action}`);
        }
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
