import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let vite;

before(async () => {
    vite = await createServer({ configFile: path.join(root, "vite.config.ts"), server: { middlewareMode: true }, appType: "custom" });
});

after(async () => {
    await vite?.close();
});

test("admin announcements screen renders publishing controls and a loading state", async () => {
    const { default: AnnouncementsPage } = await vite.ssrLoadModule("/src/pages/AnnouncementsPage.tsx");
    const html = renderToStaticMarkup(React.createElement(AnnouncementsPage, { role: "ADMIN" }));
    assert.match(html, /Announcements/);
    assert.match(html, /Publish an announcement/);
    assert.match(html, /Loading announcements/);
});

test("student announcements screen hides publishing controls", async () => {
    const { default: AnnouncementsPage } = await vite.ssrLoadModule("/src/pages/AnnouncementsPage.tsx");
    const html = renderToStaticMarkup(React.createElement(AnnouncementsPage, { role: "STUDENT" }));
    assert.match(html, /Loading announcements/);
    assert.doesNotMatch(html, /Publish an announcement/);
});

test("student reports screen renders the report filters and loading state", async () => {
    const { default: ReportsPage } = await vite.ssrLoadModule("/src/pages/ReportsPage.tsx");
    const html = renderToStaticMarkup(React.createElement(ReportsPage, { role: "STUDENT" }));
    assert.match(html, /Reports/);
    assert.match(html, /Attendance/);
    assert.match(html, /Loading report/);
});

test("login screen exposes credential fields and the administrator-provisioning policy", async () => {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const [{ default: LoginPage }, { AuthProvider }] = await Promise.all([
        vite.ssrLoadModule("/src/pages/Login/LoginPage.tsx"),
        vite.ssrLoadModule("/src/auth/AuthContext.tsx"),
    ]);
    const html = renderToStaticMarkup(React.createElement(
        MemoryRouter,
        null,
        React.createElement(AuthProvider, null, React.createElement(LoginPage)),
    ));
    assert.match(html, /type="email"/);
    assert.match(html, /type="password"/);
    assert.match(html, /Ask your school administrator to create it/);
    delete globalThis.localStorage;
});

test("teacher class response maps the roster array separately from the class student count", async () => {
    const { mapTeacherClassDetails } = await vite.ssrLoadModule("/src/pages/teacher/teacherClassData.ts");
    const details = mapTeacherClassDetails({
        class: { id: "class-1", grade: "7", section: "A", room: "12", students: 1 },
        students: [{ id: "student-1", email: "student@example.test" }],
        attendance: [{ studentId: "student-1", status: "ABSENT" }],
    });
    assert.equal(details.students.length, 1);
    assert.equal(details.students[0].email, "student@example.test");
    assert.equal(details.students[0].attendanceStatus, "ABSENT");
});

test("protected routes wait for session restoration before redirecting", async () => {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const [{ default: ProtectedRoute }, { AuthProvider }] = await Promise.all([
        vite.ssrLoadModule("/src/auth/ProtectedRoute.tsx"),
        vite.ssrLoadModule("/src/auth/AuthContext.tsx"),
    ]);
    const html = renderToStaticMarkup(React.createElement(
        MemoryRouter,
        null,
        React.createElement(AuthProvider, null, React.createElement(ProtectedRoute, null, React.createElement("div", null, "Protected content"))),
    ));
    assert.match(html, /Restoring your session/);
    assert.doesNotMatch(html, /Protected content/);
    delete globalThis.localStorage;
});
