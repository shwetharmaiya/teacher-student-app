# Teacher–Student App

A role-based school management application with a React and TypeScript frontend, an Express and TypeScript REST API, and PostgreSQL managed with Drizzle ORM. Accounts are provisioned by an administrator; current workflows include classes and enrollment, teaching assignments, teacher attendance and assignments, and student assignment submissions.

## Project status

This is an in-progress application. The core app shell and several academic workflows are connected to the API and database. Some teacher and grade workflows remain placeholders; Phases 1 through 4 are implemented, while later phases remain planned.

### Implemented

- Four account roles: `ADMIN`, `TEACHER`, `STUDENT`, and `PARENT`.
- One-time first-admin bootstrap, admin-managed user creation, and login using bcrypt password hashing and signed JWT bearer tokens.
- Session persistence in browser `localStorage`, session restoration through `/api/auth/me`, protected routes, and role-based frontend navigation.
- Admin account management: create, list, edit, and delete accounts with server-side pagination and email search; safe response projections omit password hashes. Public registration is disabled.
- Admin subject management and teaching assignments: create, list, edit, delete subjects; assign teachers, classes, and subjects; view and remove assignments.
- Teacher dashboard and assigned teaching list; class workspace with enrolled students, assignment creation, and attendance entry.
- Student dashboard, assignment list/detail/submission workflow, and final grade/feedback view.
- Teacher submission review, return-for-revision workflow, and final grading for teacher-owned assignments.
- Parent dashboard, linked-child selector, attendance, and assignment views. Parent access is limited to administrator-verified parent-student links.
- Admin parent-link workflow for verifying and revoking relationships.
- PostgreSQL schema and Drizzle migration history for users, classes, enrollments, parent links, subjects, teacher assignments, assignments, attendance, and submissions.
- Health endpoint at `GET /api/health`.

### Still in progress

- Student marks and grade views; teacher student, marks, and assignment navigation pages.

- Grading, feedback, reporting, announcements, messaging, and notifications.
- Production deployment configuration and automated tests.

Routes that currently render the shared “coming soon” feature page are placeholders, not completed workflows. The marks route now shows final grades for students and verified parents; grade correction and reopening remain deferred until an audited correction flow is designed.

## Architecture

### Runtime and responsibilities

```text
Browser
  React pages and components
    ├─ React Router selects public, authenticated, and role-specific screens
    ├─ AuthProvider owns the current user, token, loading state, login, and logout
    └─ apiFetch adds JSON headers and the bearer token
                  │ HTTP / JSON
                  ▼
Express API (backend/src/server.ts)
  ├─ CORS, JSON parsing, health endpoint, route mounting
  ├─ route modules parse inputs and apply authentication/role checks
  ├─ services apply school workflow rules and query/update data
  └─ Drizzle ORM maps TypeScript queries to PostgreSQL
                  │
                  ▼
PostgreSQL (schema + checked-in SQL migrations)
```

Responsibilities should remain separated as features grow:

- **Frontend pages/components** render role workflows, collect input, and show loading, empty, success, and error states. They should not decide whether a user is authorized to read or change a record.
- **Auth context and route guards** restore the browser session and route users to the right area. These guards improve navigation but cannot replace API authorization.
- **Express routes** define the HTTP contract, parse/validate request data, and compose middleware. Keep role checks close to route definitions.
- **Services** implement reusable business rules and data operations, such as verifying that a teacher is assigned to a class before publishing work.
- **Database schema and migrations** own persistent relationships and constraints. Every schema change should have a reviewed migration committed alongside the application change.

### Request lifecycle

1. A page calls `apiFetch` with an endpoint and request options.
2. The client prefixes the configured API URL, reads `accessToken` from `localStorage`, and sends `Authorization: Bearer <token>` when present.
3. Express routes the request under `/api`. Public auth endpoints do not require a token; protected routes run `authenticate` and, where needed, `authorizeRoles`.
4. The route validates parameters and body data (Zod is used by many endpoints), checks resource ownership/assignment, and calls a service.
5. The service reads or writes through Drizzle. PostgreSQL constraints enforce unique keys and foreign-key relationships.
6. The API returns JSON; `apiFetch` converts non-success responses into errors for the page to display.

### Current feature boundaries

- `backend/src/server.ts` mounts `/api/auth`, `/api/admin/users`, `/api/admin/parent-links`, `/api/classes`, `/api/subjects`, `/api/teacher`, `/api/student`, `/api/parent`, and `/api/class-enrollments`, and exposes `/api/health`.
- `backend/src/modules/auth/` handles bootstrap, login, and current-user resolution; `backend/src/modules/admin/` manages accounts and verified parent links; `backend/src/modules/parent/` returns data for linked children. `backend/src/middleware/` validates JWTs against the current account and enforces role access.
- `backend/src/modules/classes/` owns class and enrollment administration; `subjects/` owns subjects and teacher-class-subject assignments.
- `backend/src/modules/academic/` owns teacher/student dashboards, teacher class workspace, assignments, and attendance. Student submission operations live in `backend/src/services/` and `backend/src/routes/`.
- `frontend/src/app/App.tsx` defines public and role-gated routes. `frontend/src/auth/` manages session restoration and route guards; `frontend/src/services/api/client.ts` centralizes HTTP calls.
- `frontend/src/pages/` contains role-specific screens. Some routes intentionally render a shared placeholder while their workflows are planned.

### Main data relationships

```text
users ──< class_enrollments >── classes
users (parent) ──< parent_student_links >── users (student)
users (teacher) ──< teacher_subject_assignments >── classes
                                  └───────────────> subjects
classes ──< assignments ──< submissions >── users (student)
classes ──< attendance_records >── users (student)
```

The role is stored on `users`; enrollments link student accounts to classes; parent links connect parent accounts to student accounts after administrator verification; teacher assignments link teachers, classes, and subjects; assignments belong to a class and teacher; submissions and attendance records belong to a student and class/assignment.

The frontend lives in `frontend/`, the API in `backend/`, and the schema/migrations in `backend/src/db/schema.ts` and `backend/drizzle/`. There is no root package manifest; install and run each app from its own directory.
## Requirements

- Node.js and npm
- PostgreSQL database
- A database URL and JWT secret for the backend

## Setup

### 1. Configure the backend

Create `backend/.env` (do not commit secrets):

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/teacher_student_app
JWT_SECRET=replace-with-a-long-random-secret
BOOTSTRAP_ADMIN_KEY=replace-with-a-one-time-random-secret
FRONTEND_URL=http://localhost:5173
```

Create the database named in `DATABASE_URL` before migrating. The backend reads environment variables through `dotenv/config`.

Install dependencies and apply the checked-in Drizzle migrations:

```powershell
cd backend
npm install
npm run db:migrate
```

`npm run db:generate` creates a migration from schema changes. Review generated SQL before committing it. `npm run db:push` pushes schema changes directly and is intended for local development, not as the normal production migration process.

### 2. Configure the frontend

Optionally create `frontend/.env` to point the UI to a non-default API host:

```dotenv
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` may be the API origin (`http://localhost:3000`) or include `/api`; the client normalizes either form. If omitted, the frontend uses `http://localhost:3000/api`.

Install dependencies and start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Start the API in a separate terminal:

```powershell
cd backend
npm run dev
```

Open the Vite URL printed in the frontend terminal (normally `http://localhost:5173`). The API health check is `http://localhost:3000/api/health`.

### Build commands

Run from the relevant package directory:

```powershell
# frontend
npm run build
npm run lint

# backend
npm run build
```

The frontend also has `npm run preview` to serve a production build locally. There is no automated test script currently configured.

## First use

1. Start PostgreSQL and apply backend migrations.
2. Before any administrator exists, set `BOOTSTRAP_ADMIN_KEY` in `backend/.env`, choose a long random value, and start the API. Keep the key secret.
3. Send one `POST /api/auth/bootstrap-admin` request with the bootstrap key, administrator email, and a password of at least 12 characters. Example PowerShell request (use the same secret configured in the backend):

   ```powershell
   $bootstrapKey = Read-Host "Bootstrap key"
   $password = Read-Host "Initial admin password"
   $body = @{ email = "admin@school.example"; password = $password; bootstrapKey = $bootstrapKey } | ConvertTo-Json
   Invoke-RestMethod -Uri http://localhost:3000/api/auth/bootstrap-admin -Method Post -ContentType "application/json" -Body $body
   Remove-Variable bootstrapKey, password, body
   ```

4. After bootstrap succeeds, remove `BOOTSTRAP_ADMIN_KEY` from `backend/.env` and restart the API. If the key remains configured, the bootstrap endpoint refuses a second admin; removing the secret closes the setup path explicitly.
5. Sign in at `/login`. The admin creates teacher, student, parent, and any additional admin accounts at `/admin/users`, setting an initial password to share through the school's approved channel. The old `/register` page explains this policy; `POST /api/auth/register` returns `403`.
6. Create subjects and a class, assign teachers to class/subject pairs, enroll student accounts, and sign in as the assigned teacher to publish assignments or record attendance.
7. The root route (`/`) redirects authenticated users to their role dashboard. `/unauthorized` appears when a signed-in user visits a route for another role. The API checks the account and role on every protected request. New tokens include an account-version value, so after a password, email, or role update the user signs in again.
## API overview

All routes are mounted under `/api`. Protected endpoints expect `Authorization: Bearer <token>`. The API validates many request bodies with Zod and responds with JSON.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API status |
| `POST` | `/auth/register` | Public | Disabled; returns `403` and directs account requests to the school admin |
| `POST` | `/auth/bootstrap-admin` | Public, one time | Create the first admin using `BOOTSTRAP_ADMIN_KEY` (password minimum 12 characters) |
| `GET` | `/admin/users?search=&role=&page=&limit=` | Admin | Search and paginate safe account projections (limit max 100) |
| `POST` | `/admin/users` | Admin | Create an account with a hashed password |
| `PUT`, `DELETE` | `/admin/users/:id` | Admin | Update or delete an account; self-delete and last-admin removal are blocked |
| `GET` | `/admin/parent-links` | Admin | List verified parent-student relationships |
| `POST` | `/admin/parent-links` | Admin | Verify and link a parent and student account |
| `DELETE` | `/admin/parent-links/:id` | Admin | Revoke a parent-student relationship |
| `POST` | `/auth/login` | Public | Authenticate and receive token/user |
| `GET` | `/auth/me` | Authenticated | Resolve current user |
| `GET`, `POST` | `/classes` | Admin | List/create classes |
| `GET` | `/classes/people` | Admin | List school accounts for class setup |
| `PUT`, `DELETE` | `/classes/:id` | Admin | Update/delete a class |
| `GET`, `POST` | `/classes/:id/enrollments` | Admin | List/add enrolled students |
| `DELETE` | `/classes/:id/enrollments/:studentId` | Admin | Remove an enrolled student |
| `POST` | `/class-enrollments` | Admin | Enroll a student after UUID, role, duplicate, and class-capacity checks |
| `GET` | `/subjects` | Admin, teacher | List subjects |
| `POST`, `PUT`, `DELETE` | `/subjects` and `/subjects/:id` | Admin | Manage subjects |
| `GET`, `POST` | `/subjects/assignments` | Admin | List/create teacher-class-subject assignments |
| `DELETE` | `/subjects/assignments/:id` | Admin | Remove a teaching assignment |
| `GET` | `/subjects/my-assignments` | Teacher | List the signed-in teacher's assignments |
| `GET` | `/teacher/dashboard` | Teacher | Teacher overview and classes |
| `GET` | `/teacher/assignments` | Teacher | List assignments created by the signed-in teacher |
| `GET` | `/teacher/assignments/:assignmentId/submissions` | Assignment owner | List student work for an owned assignment |
| `PUT` | `/teacher/submissions/:submissionId/grade` | Assignment owner | Grade or return a submission with validated feedback |
| `GET` | `/teacher/classes/:classId` | Assigned teacher | Class details and attendance for a date |
| `POST` | `/teacher/assignments` | Assigned teacher | Publish an assignment to a class |
| `PUT` | `/teacher/classes/:classId/attendance` | Assigned teacher | Record attendance entries |
| `GET` | `/student/dashboard` | Student | Student overview |
| `GET` | `/student/classes` | Student | List only the signed-in student's enrolled classes |
| `GET` | `/student/attendance?classId=` | Student | Attendance summary and dated records, optionally filtered to an enrolled class |
| `GET` | `/student/assignments` | Student | List enrolled-class assignments with submission status |
| `GET` | `/student/assignments/:assignmentId` | Enrolled student | Load assignment details and the signed-in student submission |
| `POST` | `/student/assignments/:assignmentId/submissions` | Enrolled student | Submit or resubmit text content (maximum 10,000 characters) |
| `GET` | `/student/grades` | Student | Read only the signed-in student's final graded marks and feedback |
| `GET` | `/parent/children` | Parent | List only students linked to the signed-in parent |
| `GET` | `/parent/dashboard?childId=` | Parent | Read a linked child's attendance summary, classes, and recent assignments; defaults to the first linked child |
| `GET` | `/parent/attendance?childId=` | Parent | Read attendance history for a linked child |
| `GET` | `/parent/assignments?childId=` | Parent | Read published assignment details and submitted/not-submitted state for a linked child |
| `GET` | `/parent/grades?childId=` | Verified parent | Read final grades and feedback for a linked child |

Students may submit late work; the app records the submitted time and applies no automatic late penalty. Students can edit work in `SUBMITTED` or `RETURNED` state, and resubmission clears prior review fields. A teacher can move `SUBMITTED` work to `GRADED` or `RETURNED`; returned work can be resubmitted or finalized as graded. Marks are whole numbers from 0 to 100. `RETURNED` requires feedback; feedback is limited to 2,000 characters. Final `GRADED` submissions are immutable: grade changes require a future audited correction/reopen workflow. Text submissions are limited to 10,000 characters. The backend has no logout endpoint; logout is currently client-side token removal. Submission uploads are not implemented.

## Data model

- `users`: email, password hash, and role.
- `classes`: grade, section, optional teacher link, room, and capacity.
- `class_enrollments`: many-to-many class/student enrollment.
- `parent_student_links`: verified parent/student relationship, with unique pairs, verifier, and verification timestamp. One student may have multiple linked parents, and one parent may have multiple linked students.
- `subjects`: named subjects with unique codes.
- `teacher_subject_assignments`: teacher/class/subject links.
- `assignments`: class, teacher, title, description, and due date.
- `attendance_records`: per-student, per-class, per-date status (`PRESENT`, `ABSENT`, `LATE`).
- `submissions`: assignment/student content, status, marks, and feedback fields.

## Development plan

Implement each workflow vertically: schema/migration, API contract and validation, service rules, role authorization, UI, then manual/automated verification. This keeps screens from appearing complete while the corresponding server rules or data model are missing.

### Phase 1 — Finish existing assignment workflow (complete)

- Consolidated the student assignment APIs under one router; assignment IDs are validated as UUIDs and text submissions are capped at 10,000 characters.
- List/detail reads return assignments only for classes the signed-in student is enrolled in. Detail includes that student's own submission, status, marks, and feedback.
- Students can submit and resubmit text, including after the due date. Resubmission updates the existing submission and clears prior grading fields; a graded submission is locked.
- The list and detail pages show loading, empty, overdue, submitted/graded, retry, success, and API error states.

### Phase 2 — Harden identity and administration (implemented)

- Public registration now returns `403`; the public UI points users to their school administrator and no longer exposes role selection or account creation.
- The first administrator is created through `POST /api/auth/bootstrap-admin`, protected by a configured one-time secret, a 12-character minimum password, and a PostgreSQL advisory lock. The endpoint refuses to create another admin after the first exists.
- Administrators can create, search, filter by role, paginate, edit, reset passwords, and delete accounts. Passwords are bcrypt-hashed; list and mutation responses select only public account fields. Self-deletion, self-role changes, and removal/demotion of the final administrator are blocked.
- Admin pages now provide account and subject CRUD. Subject code uniqueness errors are returned as `409`.
- Enrollment checks run in a transaction that locks the class row, verifies the student role, detects duplicates, and enforces the seat limit. Class capacity cannot be lowered below current enrollment. Existing foreign keys and unique indexes enforce record links and duplicate enrollment; cross-table role rules are enforced in services. Class teachers and teacher-subject assignments must have the `TEACHER` role.
- The account list supports email search, role filters, and server-side pagination (default 20 per page; maximum 100).
### Phase 3 — Complete attendance and student views (implemented)

1. Added student class and attendance endpoints. They derive the student ID from the authenticated session; the API accepts no student ID from the browser. Attendance can be filtered by class ID, and the query remains scoped to that signed-in student.
2. Replaced the student classes and attendance placeholders with working pages. The classes page shows enrolled class, teacher, and room; attendance shows a filterable dated record list plus present, late, absent, and attendance-rate summaries, with loading, empty, retry, and API-error states.
3. Attendance writes verify teacher assignment and every submitted student’s enrollment inside the write service. The roster is checked for duplicate student IDs and bounded to the class capacity limit (200 entries).
4. Roster upserts run in a database transaction while locking the class row. A request either updates/inserts all submitted records for that date or rolls back; repeated saves update the existing class/student/date record.

### Phase 4 — Parent data model and views (implemented)

1. Added `parent_student_links` with foreign keys, unique parent/student pairs, lookup indexes, verifier identity, and verification time in migration `0005_gigantic_network.sql`.
2. A student may have multiple linked parents, and a parent may have multiple linked students. An administrator must confirm the relationship through school records or the school's approved contact process before creating the link; the API stores the verifying admin and timestamp. Administrators can revoke links.
3. Parent APIs derive the parent account ID from the JWT. Every child-specific API checks the link and the student's current `STUDENT` role; unlinked child IDs return `404`.
4. Added admin parent-link management and parent dashboard, child selector, attendance history, and assignment list. Assignment views expose due date and submitted/not-submitted state only; marks, feedback, and submission content remain out of scope until grading is implemented.

### Phase 5 — Grading and assessment (implemented)

1. Added teacher endpoints to list teacher-owned assignments and the submissions for each assignment. The review API exposes student work only to the teacher recorded as the assignment owner.
2. Grade requests validate the status transition, integer mark range (0–100), feedback length (2,000 characters), and required revision feedback. Final grades cannot be changed or silently reopened.
3. Added teacher assignment review screens to inspect text submissions, return work with feedback, and persist final marks and feedback. Student resubmission and teacher review lock the assignment row in transactions so the two actions cannot race.
4. Added student and verified-parent grade views. Student queries derive student ID from the session; parent queries require an active verified parent/student link and return final graded data only.
5. Policy: late submissions are accepted with no automatic penalty and preserve their submission timestamp. Students may resubmit while work is `SUBMITTED` or `RETURNED`; resubmission resets review fields. Teachers may grade submitted/returned work or return it for revisions. `GRADED` is terminal; grade corrections need a future audited correction/reopen flow.

### Phase 6 — Communication and reporting

1. Model announcements with author, audience/class targeting, publication time, and visibility rules.
2. Add notifications only after the source events and read/unread behavior are defined.
3. Build attendance and grade reports from server-side queries with role-scoped filters; add exports after report totals are verified.
4. Consider audit history for grade, attendance, enrollment, and account changes.

### Phase 7 — Release readiness

1. Add API and UI tests for login, role denial, class ownership, enrollment, attendance, assignments, and parent scoping.
2. Add consistent error handling, request logging, database connection shutdown, and deployment environment documentation.
3. Review CORS, secrets, rate limiting, registration policy, and token/session storage for the target deployment.
4. Run migration and build checks in CI, and document backup/restore and rollback expectations.

### Definition of done for each workflow

- The migration is repeatable and constraints reflect the business rules.
- Requests validate input and return documented status codes and response shapes.
- The API checks role **and** record ownership/assignment; frontend route guards alone are insufficient.
- The UI handles loading, empty, success, validation, and server-error cases.
- The workflow has focused tests and a short manual verification path in the README or project docs.
## Security and operational notes

- Passwords are hashed with bcrypt; raw passwords are not stored.
- JWTs are signed with `JWT_SECRET`; set a strong secret outside source control.
- The browser currently stores access tokens in `localStorage`. Consider secure HttpOnly cookie-based sessions and refresh/session management for production.
- Keep CORS `FRONTEND_URL` aligned with the deployed frontend origin.
- The API and database must be reachable from the frontend user's environment; `VITE_API_URL` is compiled into the frontend build.
- Parent access and student-specific records require server-side relationship/ownership checks as those features are added.

## Repository map

```text
backend/
  src/modules/       Auth, classes, subjects, academic routes/services
  src/middleware/    Authentication and role authorization
  src/db/            Drizzle schema and PostgreSQL connection
  drizzle/           SQL migrations and migration metadata
frontend/
  src/auth/          Auth context and route guards
  src/app/           Router and app providers
  src/pages/         Admin, teacher, student, and parent screens
  src/services/api/  Shared API fetch client
```




