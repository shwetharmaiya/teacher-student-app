# Teacher–Student App

A web application for school administrators, teachers, students, and parents. It supports account and class management, teaching assignments, attendance, assignments and submissions, grades, parent access to linked students, announcements, notifications, and reports.

## Contents

- [What you need](#what-you-need)
- [Set up and run the application](#set-up-and-run-the-application)
- [Create the first administrator](#create-the-first-administrator)
- [Using the application](#using-the-application)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Build and test](#build-and-test)
- [Configuration reference](#configuration-reference)
- [Security and data handling](#security-and-data-handling)

## What you need

- Node.js 24 or later and npm
- PostgreSQL 16 or later
- A database for the application

The frontend and backend are separate applications. Run their install and npm commands from their respective directories.

## Set up and run the application

### 1. Create and configure the database

Create a PostgreSQL database, then copy the backend environment template:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and set values for your environment:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/teacher_student_app
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
FRONTEND_URL=http://localhost:5173
```

`JWT_SECRET` must contain at least 32 characters. `FRONTEND_URL` must be the exact browser origin used by the frontend. For local development, the default Vite origin is `http://localhost:5173`.

Install the backend dependencies and apply the database migrations:

```powershell
Set-Location backend
npm install
npm run db:migrate
```

### 2. Configure the frontend

The frontend defaults to the API at `http://localhost:3000/api`. To use another API host, create `frontend/.env` with:

```dotenv
VITE_API_URL=http://localhost:3000
```

The value can be the API origin or an origin ending in `/api`.

Install dependencies:

```powershell
Set-Location frontend
npm install
```

### 3. Start the applications

Keep two terminals open. Start the backend in one:

```powershell
Set-Location backend
npm run dev
```

Start the frontend in the other:

```powershell
Set-Location frontend
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. Check that the API and its database connection are available at `http://localhost:3000/api/health`; a healthy response contains `{"status":"ok","checks":{"database":"ok"}}`.

## Create the first administrator

Public sign-up is disabled. The first administrator account is created once through the bootstrap endpoint.

1. In `backend/.env`, set `BOOTSTRAP_ADMIN_KEY` to a long, private, one-time value:

   ```dotenv
   BOOTSTRAP_ADMIN_KEY=use-a-long-random-one-time-value
   ```

2. Start or restart the backend so it reads the setting.
3. From PowerShell, send the bootstrap request. Choose an administrator password with at least 12 characters:

   ```powershell
   $bootstrapKey = Read-Host "Bootstrap key"
   $password = Read-Host "Initial administrator password"
   $body = @{
       email = "admin@school.example"
       password = $password
       bootstrapKey = $bootstrapKey
   } | ConvertTo-Json

   Invoke-RestMethod `
       -Uri "http://localhost:3000/api/auth/bootstrap-admin" `
       -Method Post `
       -ContentType "application/json" `
       -Body $body

   Remove-Variable bootstrapKey, password, body
   ```

4. Remove `BOOTSTRAP_ADMIN_KEY` from `backend/.env` and restart the backend. Bootstrap is only available while no administrator account exists.
5. Sign in at `/login` using the new administrator account.

If an administrator already exists, bootstrap will not create another one. An administrator can update a user's password from the account-management screen.

## Using the application

After signing in, the home page and navigation are tailored to the account's role. Accounts are created by the school administrator; there is no public account-registration flow.

### Administrator

1. Open **Users** to create teacher, student, parent, and additional administrator accounts. Set a temporary password and share it through the school's approved channel.
2. Open **Subjects** and add the subjects offered by the school.
3. Open **Classes** and create classes with a grade, section, room, and capacity.
4. Open **Teaching assignments** and connect each teacher to the classes and subjects they teach.
5. Enroll student accounts in their classes.
6. Open **Parent links** to connect a parent account with a student. Parent access begins after an administrator verifies the relationship.
7. Use the dashboard for current school totals. Administrators can also publish school-wide or class announcements and view school-scoped reports.

The administrator can search and manage accounts. Deleting your own account and removing the final administrator are blocked.

### Teacher

1. Sign in with the account and password provided by the administrator.
2. Open **My teaching** or **Classes** to view assigned classes and subjects. These lists depend on the administrator having created the teaching assignment.
3. Open a class workspace to review its enrolled students, publish an assignment, or record attendance for a date.
4. Open **Assignments** to review student submissions. A submission can be graded with a mark from 0 to 100 and optional feedback, or returned with feedback for revision.
5. Use **Announcements**, **Reports**, and **Notifications** from the navigation to communicate with the applicable audience and review your permitted data.

Teachers can access only their assigned classes and their own assignments and submissions.

### Student

1. Sign in with the account and password provided by the administrator.
2. Use **Dashboard** and **Classes** to see your enrolled classes and current schoolwork.
3. Open **Assignments**, select an assignment, and submit your response as text. Text submissions are limited to 10,000 characters; file uploads are not supported.
4. A submission may be edited while it is awaiting review or has been returned. Returning work includes the teacher's feedback. Once graded, a submission is final and cannot be changed in the application.
5. Open **Attendance** and **Grades** to see your records, marks, and feedback. Use **Announcements** and **Notifications** to see messages relevant to your account.

Late work is accepted and its submission time is recorded. The application does not apply an automatic late penalty.

### Parent

1. Sign in with the account and password provided by the administrator.
2. Select one of your linked children from the parent dashboard. If no child is listed, ask the administrator to verify the parent-student link.
3. View the selected child's classes, attendance, assignments, and final grades. Switch children to view another linked student's records.
4. Use **Announcements**, **Reports**, and **Notifications** to view information available to your account.

Parent access is limited to students with a verified link to that parent account.

## Common tasks

### Change a user's password

An administrator can edit the account from **Users** and set a new password. The user should sign in again with the updated password. The application does not provide self-service password recovery.

### Publish an announcement

Administrators and teachers can publish announcements. Choose a school-wide audience or a class audience where available. Students and parents see announcements only when they are included in the intended audience. Eligible recipients receive an in-app notification.

### Read or clear notifications

Open **Notifications** to view messages and their read status. Mark a notification as read when opened, or use the available control to mark all notifications as read. Each account can change only its own notification state.

### Read reports

Open **Reports** and select the available date range, class, student, or page filters. Report scope follows the signed-in role: administrators can view school data, teachers see assigned classes, students see their own data, and parents see data for linked children.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| The API health endpoint is unavailable | Confirm PostgreSQL is running, `DATABASE_URL` is correct, migrations have been applied, and the backend is running on the configured port. |
| The frontend cannot reach the API | Confirm `VITE_API_URL` points to the API and `FRONTEND_URL` includes the exact frontend origin. Restart Vite after changing frontend environment variables. |
| Sign-in says the email or password is invalid | Confirm the account exists and use the latest password provided by the administrator. Ask an administrator to update the password if needed. |
| A teacher has no classes | Ask the administrator to create the class and assign the teacher to the class and subject. |
| A student has no classes or assignments | Ask the administrator to enroll the student in a class. Assignments are available to students in the class they target. |
| A parent has no linked children | Ask the administrator to create and verify the parent-student link. |
| A page says access is unauthorized | Sign in with an account that has the required role. Access to individual records is also checked by the API. |

## Build and test

Run commands from the relevant application directory.

```powershell
Push-Location frontend
npm test
npm run build
npm run lint
Pop-Location

Push-Location backend
npm run build
Pop-Location
```

The backend integration tests require a dedicated PostgreSQL test database. Never point `TEST_DATABASE_URL` at a database containing data you need to keep. Configure both database variables to the isolated test database, apply migrations, then run the tests:

```powershell
Set-Location backend
$env:DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/teacher_student_app_test"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:migrate
npm test
Remove-Item Env:DATABASE_URL, Env:TEST_DATABASE_URL
```

## Configuration reference

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. |
| `JWT_SECRET` | Yes | Secret used to sign access tokens; at least 32 characters. |
| `FRONTEND_URL` | Yes | One or more exact allowed frontend origins, separated by commas. Production origins must use HTTPS. |
| `PORT` | No | API port; defaults to `3000`. |
| `NODE_ENV` | No | Runtime mode; defaults to `development`. |
| `BOOTSTRAP_ADMIN_KEY` | First setup only | Secret required to create the first administrator. Remove it after bootstrap. |
| `TEST_DATABASE_URL` | Tests only | Dedicated, migrated PostgreSQL database used by backend integration tests. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | No | API origin or `/api` URL. Defaults to `http://localhost:3000/api`. |

## Security and data handling

- Do not commit `.env` files or share bootstrap keys, JWT secrets, or passwords in source control.
- Passwords are stored as bcrypt hashes. Public registration is disabled.
- Remove the bootstrap key after creating the first administrator.
- The browser stores the access token in `localStorage`; use HTTPS for deployed environments and restrict access to trusted devices.
- Configure `FRONTEND_URL` with only the frontend origins that should call the API.
- The application enforces role and record access in the API. Do not rely on hidden navigation links as an access control.
- Attendance statuses are `PRESENT`, `ABSENT`, or `LATE`. Assignment marks range from 0 to 100. Returned work requires teacher feedback; final graded work is immutable in the application.
- Submission uploads and self-service password recovery are not available.

## Project layout

```text
backend/                 Express API, PostgreSQL schema, and migrations
frontend/                React web application
  src/app/               Application routes
  src/auth/              Session state and route guards
  src/components/        Shared interface components
  src/pages/             Admin, teacher, student, parent, and auth screens
  src/services/          API client
  src/types/             Frontend TypeScript types
  src/utils/              Frontend utility functions
database/                Database-related project files
.github/workflows/       Continuous integration workflow
```
