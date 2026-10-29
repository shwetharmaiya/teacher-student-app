# Teacher–Student App

A role-based school management application with a React and TypeScript frontend, an Express and TypeScript REST API, and PostgreSQL managed with Drizzle ORM. Accounts are provisioned by an administrator; current workflows include classes and enrollment, teaching assignments, teacher attendance and assignments, and student assignment submissions.

## Project status

This is an in-progress application. Phases 1 through 7 are implemented, including scoped announcements, in-app notifications, attendance and grade reports, audit events, automated API/UI coverage, and release-readiness checks. Production deployment configuration still needs to be completed for the target hosting environment.

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
- Announcements for school-wide and class audiences, with notification fan-out to eligible users.
- In-app notifications for published announcements and grading events, with owner-only read/unread controls.
- Server-calculated, role-scoped attendance and grade reports with filters, summary totals, and pagination.
- Audit events for account, enrollment, attendance-roster, and grading changes.
- PostgreSQL schema and Drizzle migration history for users, classes, enrollments, parent links, subjects, teacher assignments, assignments, attendance, and submissions.
- Health endpoint at `GET /api/health`.

### Still in progress

- Production deployment configuration for the selected hosting provider, including managed secrets, database operations, monitoring, and a verified backup/restore exercise.

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
  ├─ Drizzle ORM maps TypeScript queries to PostgreSQL
  └─ announcement, notification, report, and audit services enforce visibility and ownership
                  │
                  ▼
PostgreSQL (schema + checked-in SQL migrations)
```

Responsibilities should remain separated as features grow:

- **Frontend pages/components** render role workflows, collect input, and show loading, empty, success, and error states. They should not decide whether a user is authorized to read or change a record.
- **Auth context and route guards** restore the browser session and route users to the right area. These guards improve navigation but cannot replace API authorization.
- **Express routes** define the HTTP contract, parse/validate request data, and compose middleware. Keep role checks close to route definitions.
- **Services** implement reusable business rules and data operations, such as verifying that a teacher is assigned to a class before publishing work.
- **Announcements and notifications** resolve audiences on the server; notification read state belongs to one account.
- **Reports** calculate totals in the API after role-scoped filters are applied. The browser selects filters and renders returned summaries.
- **Audit events** record actor, action, entity, and limited metadata. They do not store passwords, submission text, or feedback.
- **Database schema and migrations** own persistent relationships and constraints. Every schema change should have a reviewed migration committed alongside the application change.

### Request lifecycle

1. A page calls `apiFetch` with an endpoint and request options.
2. The client prefixes the configured API URL, reads `accessToken` from `localStorage`, and sends `Authorization: Bearer <token>` when present.
3. Express routes the request under `/api`. Public auth endpoints do not require a token; protected routes run `authenticate` and, where needed, `authorizeRoles`.
4. The route validates parameters and body data (Zod is used by many endpoints), checks resource ownership/assignment, and calls a service.
5. The service reads or writes through Drizzle. PostgreSQL constraints enforce unique keys and foreign-key relationships.
6. The API returns JSON; `apiFetch` converts non-success responses into errors for the page to display.

### Current feature boundaries

- `backend/src/server.ts` mounts `/api/auth`, `/api/admin/users`, `/api/admin/parent-links`, `/api/classes`, `/api/subjects`, `/api/teacher`, `/api/student`, `/api/parent`, `/api/announcements`, `/api/notifications`, `/api/reports`, and `/api/class-enrollments`, and exposes `/api/health`.
- `backend/src/modules/auth/` handles bootstrap, login, and current-user resolution; `backend/src/modules/admin/` manages accounts and verified parent links; `backend/src/modules/parent/` returns data for linked children. `backend/src/middleware/` validates JWTs against the current account and enforces role access.
- `backend/src/modules/classes/` owns class and enrollment administration; `subjects/` owns subjects and teacher-class-subject assignments.
- `backend/src/modules/academic/` owns teacher/student dashboards, teacher class workspace, assignments, and attendance. Student submission operations live in `backend/src/services/` and `backend/src/routes/`.
- `backend/src/modules/announcements/`, `notifications/`, and `reports/` own audience-scoped communications, read state, and server-side reporting.
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
users (author) ──< announcements ──< notifications >── users (recipient)
users (actor) ──< audit_logs
```

The role is stored on `users`; enrollments link student accounts to classes; parent links connect parent accounts to student accounts after administrator verification; teacher assignments link teachers, classes, and subjects; assignments belong to a class and teacher; submissions and attendance records belong to a student and class/assignment.

The frontend lives in `frontend/`, the API in `backend/`, and the schema/migrations in `backend/src/db/schema.ts` and `backend/drizzle/`. Drizzle reads the TypeScript schema from `backend/src/db/`; the `backend/drizzle/` directory is reserved for reviewed SQL migrations and their metadata. Install and run each app from its own directory.

### Repository map

```text
.
├── .github/workflows/       # CI validation pipeline
├── backend/
│   ├── drizzle/             # Reviewed SQL migrations and Drizzle metadata
│   ├── src/
│   │   ├── db/              # Database client and canonical schema
│   │   ├── middleware/      # Authentication, role, and request middleware
│   │   ├── modules/         # Feature APIs and services by domain
│   │   ├── routes/          # Shared workflow routes
│   │   ├── services/        # Reusable workflow services
│   │   └── app.ts, server.ts
│   └── test/                # API and configuration tests
├── frontend/
│   ├── src/
│   │   ├── app/             # Router and app-level providers
│   │   ├── auth/            # Session state and route guards
│   │   ├── components/      # Shared interface components
│   │   ├── pages/           # Role-oriented screens
│   │   └── services/        # API client and browser integrations
│   └── tests/               # UI smoke tests
└── README.md
```

`package-lock.json` files are kept per application, matching their independent dependency and install lifecycles. Build output, dependencies, coverage, local environment files, and editor/OS artifacts are ignored by Git.
## Requirements

- Node.js and npm
- PostgreSQL database
- A PostgreSQL `DATABASE_URL`, a `JWT_SECRET` of at least 32 characters, and one or more exact frontend origins in `FRONTEND_URL`

## Setup

### 1. Configure the backend

Copy `backend/.env.example` to `backend/.env` (do not commit secrets):

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/teacher_student_app
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
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

Open the Vite URL printed in the frontend terminal (normally `http://localhost:5173`). The API readiness check is `http://localhost:3000/api/health`; it returns `503` when PostgreSQL is unavailable.

### Build commands

Run from the relevant package directory:

```powershell
# frontend
npm run build
npm run lint

# backend
npm run build
```

The frontend also has `npm run preview` to serve a production build locally. See the test commands below for the UI smoke and API integration suites.

### Test commands

Backend API integration tests require a dedicated PostgreSQL test database. They refuse to use `DATABASE_URL` as a fallback; the test runner only connects when `TEST_DATABASE_URL` is explicitly set. Apply migrations to that isolated database before running:

The test runner loads `backend/.env` through `dotenv`; define `TEST_DATABASE_URL` there using the exact variable name with underscores. Alternatively, set it in the shell used to run `npm test`. Do not put it in `frontend/.env`.

```powershell
cd backend
$env:DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/teacher_student_app_test"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:migrate
npm test
Remove-Item Env:DATABASE_URL, Env:TEST_DATABASE_URL
```

If using `backend/.env`, set both `DATABASE_URL` and `TEST_DATABASE_URL` to the dedicated test database before migration and testing. Never point either variable at a database containing data you need to keep.

The API suite creates uniquely named accounts/classes, covers workflows from Phases 1–7, and removes its fixtures. It checks assignment detail, content limits, resubmission and late work; account and subject administration; class ownership, enrollment, and capacity; attendance ownership, atomic roster saves, and student identity; parent linking/revocation and child scoping; grade validation, return/resubmit/finalize transitions and grade views; announcement visibility, notification ownership, report filters/totals, and audit events. Frontend `npm test` smoke-renders login, student assignment/class/attendance/grade pages, teacher class/review/workspace pages, parent attendance/assignment/grade tabs, admin user/link pages, announcements, reports, and protected-route restoration. GitHub Actions runs both test commands, applies migrations on a disposable PostgreSQL service, and builds both applications.

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
| `GET`, `POST` | `/announcements` | Authenticated; admin/teacher can publish | List visible announcements or publish a school/class announcement |
| `GET` | `/notifications?unreadOnly=&page=&limit=` | Authenticated | List the signed-in user's notifications and unread count |
| `PUT` | `/notifications/:id/read` | Notification owner | Mark one notification read |
| `PUT` | `/notifications/read-all` | Authenticated | Mark all of the signed-in user's notifications read |
| `GET` | `/reports/attendance?from=&to=&classId=&studentId=&page=&limit=` | Authenticated | Role-scoped attendance summary and records |
| `GET` | `/reports/grades?from=&to=&classId=&studentId=&page=&limit=` | Authenticated | Role-scoped final-grade summary and records |

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
- `announcements`: author, SCHOOL/CLASS audience, optional class target, content, and publication timestamps.
- `notifications`: event type, recipient, destination, source entity, creation time, and nullable `read_at` state.
- `audit_logs`: actor, action, entity reference, limited JSON metadata, and event timestamp.

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

### Phase 6 — Communication and reporting (implemented)

1. Announcements store author, audience, optional class target, and publication time. Admins can publish to the school or a class; teachers can publish only to classes they teach. Students see announcements for enrolled classes, while parents see announcements for classes attended by linked children. Future-dated announcements are hidden until publication.
2. In-app notification sources are explicit: announcement publication notifies eligible recipients except the author; final grading notifies the student and verified linked parents; returning work notifies the student. A user can list, mark one read, or mark all read. API reads and updates are restricted to the authenticated recipient. Email and push delivery are not included.
3. Attendance and grade reports calculate summaries on the server and support pagination and date/class filters. Admins can report school-wide; teachers are limited to assigned classes; students see only their own records; parents see only records for linked children. Student-specific parent filters are checked against the verified relationship. Exports are deferred until report totals are verified against operational data.
4. Audit events cover account create/update/delete, enrollment add/remove, attendance roster saves, and grade/return actions. Metadata excludes passwords, submission text, and feedback. An audit history screen is future work.
5. Migration `0006_ancient_blockbuster.sql` adds announcement, notification, and audit tables. Apply with `cd backend; npm run db:migrate` before using these routes against a database.

### Phase 7 — Release readiness

1. Added PostgreSQL-backed API integration coverage across assignment, administration, enrollment, attendance, parent-link, grading, announcement, notification, reporting, and audit flows. Added configuration validation tests and role-specific frontend screen smoke tests. The integration suite runs only against an explicitly configured test database.
2. Added exact-origin CORS allowlisting, request IDs and structured request logs, baseline security headers, a 1 MB JSON body limit, a global 404/error response, auth endpoint rate limits, and graceful HTTP/database-pool shutdown on SIGINT/SIGTERM.
3. Startup validates PostgreSQL URL, a 32-character minimum JWT secret, allowed frontend origins, port, and HTTPS origins in production. Public registration remains disabled and first-admin bootstrap remains a deliberate one-time path. Login/bootstrap are limited to 20 attempts per IP per 15 minutes in a single process. Tokens remain in browser `localStorage`; use HTTPS and consider HttpOnly secure cookies before production if the authentication architecture is upgraded.
4. Added GitHub Actions with disposable PostgreSQL, migration application, backend tests/build, frontend tests/build, and lint. Backup, restore, and rollback steps are documented below.

### Production backup, restore, and rollback

Take a PostgreSQL custom-format backup before every production migration and store it in access-controlled encrypted storage. Do not keep credentials in command history; use `PGPASSWORD` only through a secret manager or prompt.

```powershell
pg_dump --format=custom --no-owner --file="school-before-release.dump" "$env:DATABASE_URL"
```

To restore into a newly created recovery database, preserve the original database for investigation and use:

```powershell
createdb school_recovery
pg_restore --no-owner --dbname="school_recovery" "school-before-release.dump"
```

Drizzle migrations in this repository do not have generated down migrations. For an application rollback, first deploy the prior compatible application version. If the migration is not backward-compatible or data must be reverted, stop writes, restore the pre-release backup into a separate database, validate it, and switch the application connection during a controlled maintenance window. Prefer a forward-fix migration for production data corrections; never run `db:push` as a production rollback strategy. Verify health, login, scoped reads/writes, and migration state after recovery.

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
- `FRONTEND_URL` accepts comma-separated exact origins. Production requires HTTPS origins. Login and bootstrap are rate-limited in memory to 20 attempts per client IP per 15 minutes; use an edge or shared rate limiter if deploying multiple API instances.
- Do not commit `.env` files. Validate the bootstrap secret is removed after first-admin provisioning, rotate JWT secrets deliberately, and use the same strong JWT secret across healthy API instances during a deployment.
- The API and database must be reachable from the frontend user's environment; `VITE_API_URL` is compiled into the frontend build.
- Parent access and student-specific records require server-side relationship/ownership checks as those features are added.
- Announcements, reports, and notifications apply server-side visibility scopes; keep those checks in the API if new screens or exports are added.

## Repository map

```text
backend/
  src/modules/       Auth, classes, subjects, academic, announcement, report, and notification routes/services
  src/middleware/    Authentication and role authorization
  src/db/            Drizzle schema and PostgreSQL connection
  drizzle/           SQL migrations and migration metadata
frontend/
  src/auth/          Auth context and route guards
  src/app/           Router and app providers
  src/pages/         Admin, teacher, student, and parent screens
  src/services/api/  Shared API fetch client
```




