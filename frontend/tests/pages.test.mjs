import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let vite;

before(async () => {
    vite = await createServer({ configFile: path.join(root, "vite.config.ts"), server: { middlewareMode: true }, appType: "custom" });
});

after(async () => {
    await vite?.close();
});

async function renderPage(modulePath, { props = {}, initialEntry = "/", routePath = "*" } = {}) {
    const { default: Page } = await vite.ssrLoadModule(modulePath);
    return renderToStaticMarkup(React.createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        React.createElement(Routes, null, React.createElement(Route, { path: routePath, element: React.createElement(Page, props) })),
    ));
}

test("admin dashboard displays live-data loading states without placeholder totals", async () => {
    const html = await renderPage("/src/pages/admin/AdminDashboard.tsx");
    assert.match(html, /Admin dashboard/);
    assert.match(html, /Today(?:&#x27;|')s attendance/);
    assert.match(html, /Loading today(?:&#x27;|')s attendance/);
    assert.doesNotMatch(html, />842</);
    assert.doesNotMatch(html, />94\.2%/);
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

test("student assignment list and detail flows render loading and submission UI states", async () => {
    const list = await renderPage("/src/pages/student/StudentAssignmentsPage.tsx", { initialEntry: "/student/assignments" });
    assert.match(list, /My Assignments/);
    assert.match(list, /Loading assignments/);
    const detail = await renderPage("/src/pages/student/StudentAssignmentDetailsPage.tsx", { initialEntry: "/student/assignments/assignment-1", routePath: "/student/assignments/:assignmentId" });
    assert.match(detail, /Loading assignment/);
});

test("student classes, attendance, and grade screens render their initial states", async () => {
    const cases = [
        ["/src/pages/student/StudentClassesPage.tsx", /My classes/],
        ["/src/pages/student/StudentAttendancePage.tsx", /My attendance/],
        ["/src/pages/student/StudentGradesPage.tsx", /My grades/],
    ];
    for (const [modulePath, expected] of cases) {
        const html = await renderPage(modulePath);
        assert.match(html, expected, modulePath);
        assert.match(html, /Loading/);
    }
});

test("teacher students, attendance, classes, assignment review, and workspace screens render", async () => {
    const students = await renderPage("/src/pages/teacher/TeacherStudentsPage.tsx");
    assert.match(students, /My students/);
    assert.match(students, /Loading your students/);
    const classes = await renderPage("/src/pages/teacher/TeacherClassesPage.tsx");
    assert.match(classes, /My classes/);
    assert.match(classes, /Loading your classes/);
    const attendance = await renderPage("/src/pages/teacher/TeacherClassesPage.tsx", { props: { mode: "attendance" } });
    assert.match(attendance, /<h2>Attendance<\/h2>/);
    assert.match(attendance, /Loading your classes/);
    const review = await renderPage("/src/pages/teacher/TeacherSubmissionsPage.tsx");
    assert.match(review, /Assignment review/);
    assert.match(review, /Loading assignments/);
    const workspace = await renderPage("/src/pages/teacher/TeacherClassWorkspacePage.tsx", { initialEntry: "/teacher/classes/class-1?subjectId=subject-1", routePath: "/teacher/classes/:classId" });
    assert.match(workspace, /Loading class workspace/);
});

test("admin account and parent-link screens render their management forms", async () => {
    const users = await renderPage("/src/pages/admin/UsersPage.tsx");
    assert.match(users, /User accounts/);
    assert.match(users, /Loading accounts/);
    const links = await renderPage("/src/pages/admin/ParentLinksPage.tsx");
    assert.match(links, /Parent links/);
    assert.match(links, /Verify and link accounts/);
});

test("parent attendance, assignment, and grade views render for every tab", async () => {
    for (const [type, heading] of [["attendance", /Attendance/], ["assignments", /Assignments/], ["grades", /Grades/]]) {
        const html = await renderPage("/src/pages/parent/ParentRecordsPage.tsx", { props: { type }, initialEntry: "/parent/records" });
        assert.match(html, heading);
        assert.match(html, /Loading/);
    }
});
