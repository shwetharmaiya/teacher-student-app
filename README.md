# Teacher–Student App

A full-stack teacher–student management application built with **React + Vite** on the frontend and **Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL** on the backend.

The application is designed around four roles:

- **ADMIN**
- **TEACHER**
- **STUDENT**
- **PARENT**

This README captures the architecture, authentication plan, routing strategy, database direction, feature ideas, API structure, and implementation roadmap discussed so far.

---

## 1. Project Goals

The application should provide a role-based platform where:

### Admin
- Manage users
- Manage teachers
- Manage students
- Manage parents
- Manage classes
- View reports
- Configure application data

### Teacher
- View assigned classes
- View students
- Take attendance
- Create assignments
- Review submissions
- Enter/update grades
- Communicate with students/parents

### Student
- View classes and subjects
- View assignments
- Submit assignments
- View grades
- View attendance
- View announcements

### Parent
- View linked child/student
- View attendance
- View assignments
- View grades
- Receive announcements
- Communicate with teachers

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- React Context
- Fetch API
- CSS/component library as required

## Backend

- Node.js
- Express 5
- TypeScript
- JWT
- bcrypt
- Zod
- CORS
- dotenv

## Database

- PostgreSQL
- Drizzle ORM
- Drizzle Kit

---

# 3. High-Level Architecture

```text
                         React Frontend
                              │
                              │ HTTP/JSON
                              ▼
                     Express REST API
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Authentication              Authorization
             JWT                    Role checking
                 │                         │
                 └────────────┬────────────┘
                              ▼
                         Controllers
                              │
                              ▼
                           Services
                              │
                              ▼
                         Drizzle ORM
                              │
                              ▼
                         PostgreSQL
```

The recommended backend request flow is:

```text
Route
  ↓
Authentication middleware
  ↓
Role authorization middleware
  ↓
Controller
  ↓
Service
  ↓
Database
```

---

# 4. Suggested Project Structure

## Backend

```text
backend/
└── src/
    ├── db/
    │   ├── index.ts
    │   └── schema.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts
    │   └── role.middleware.ts
    │
    ├── utils/
    │   └── jwt.ts
    │
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.routes.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.service.ts
    │   │   └── auth.validation.ts
    │   │
    │   └── users/
    │       ├── user.routes.ts
    │       ├── user.controller.ts
    │       └── user.service.ts
    │
    └── server.ts
```

## Frontend

```text
frontend/
└── src/
    ├── auth/
    │   ├── AuthContext.tsx
    │   ├── ProtectedRoute.tsx
    │   └── RoleRoute.tsx
    │
    ├── pages/
    │   ├── Login.tsx
    │   │
    │   ├── admin/
    │   │   └── AdminDashboard.tsx
    │   │
    │   ├── teacher/
    │   │   └── TeacherDashboard.tsx
    │   │
    │   ├── student/
    │   │   └── StudentDashboard.tsx
    │   │
    │   └── parent/
    │       └── ParentDashboard.tsx
    │
    ├── components/
    │   ├── layout/
    │   ├── navigation/
    │   ├── common/
    │   └── forms/
    │
    ├── services/
    │   └── api.ts
    │
    ├── types/
    │   └── index.ts
    │
    ├── App.tsx
    └── main.tsx
```

---

# 5. User Roles

The application uses four roles:

```ts
export type UserRole =
  | "ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";
```

The database user currently has a structure similar to:

```ts
{
  id: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  createdAt: Date;
  updatedAt: Date;
}
```

Important:

- The database field is `passwordHash`, not `password`.
- User IDs are strings.
- Passwords must never be stored as plain text.

---

# 6. Authentication

JWT authentication is used.

The basic authentication flow is:

```text
User enters email/password
        ↓
POST /api/auth/login
        ↓
Validate request with Zod
        ↓
Find user in PostgreSQL
        ↓
Compare password using bcrypt
        ↓
Create JWT
        ↓
Return token + user
        ↓
React stores token
        ↓
React restores session using /me
```

---

# 7. Authentication API

Current authentication endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Register

```text
POST /api/auth/register
```

Example body:

```json
{
  "email": "teacher@example.com",
  "password": "password123",
  "role": "TEACHER"
}
```

## Login

```text
POST /api/auth/login
```

Example body:

```json
{
  "email": "teacher@example.com",
  "password": "password123"
}
```

Example response:

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "email": "teacher@example.com",
    "role": "TEACHER"
  }
}
```

## Current user

```text
GET /api/auth/me
```

Requires:

```text
Authorization: Bearer <JWT>
```

Example response:

```json
{
  "user": {
    "id": "USER_ID",
    "email": "teacher@example.com",
    "role": "TEACHER"
  }
}
```

---

# 8. JWT

JWT payload:

```ts
export interface JwtPayload {
  userId: string;
  role: UserRole;
}
```

JWT creation:

```ts
const token = createToken({
  userId: user.id,
  role: user.role,
});
```

The token should have an expiration.

Current planned expiration:

```text
1 day
```

The JWT secret comes from an environment variable:

```text
JWT_SECRET=your-secret
```

Never commit the real JWT secret to Git.

---

# 9. Authentication Middleware

The authentication middleware checks:

```text
Authorization: Bearer <token>
```

If no token exists:

```text
401 Authentication required
```

If the token is invalid or expired:

```text
401 Invalid or expired token
```

If valid, the decoded user information is attached to the request.

Conceptually:

```text
Request
  ↓
Authorization header
  ↓
Extract Bearer token
  ↓
Verify JWT
  ↓
req.user = JWT payload
  ↓
next()
```

---

# 10. Role Authorization

Authentication and authorization are separate concepts.

### Authentication

Answers:

> Who is this user?

### Authorization

Answers:

> Is this user allowed to access this resource?

The role middleware uses:

```ts
authorizeRoles("ADMIN")
```

or:

```ts
authorizeRoles("ADMIN", "TEACHER")
```

Expected status codes:

```text
401 → User is not authenticated

403 → User is authenticated but does not have permission
```

Example:

```ts
router.get(
  "/teachers",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  getTeachers
);
```

---

# 11. Do Not Protect Login/Register

Authentication should not be applied globally.

This is incorrect:

```ts
app.use(authenticate);
```

because `/login` and `/register` would require an existing JWT.

Instead:

```ts
router.post("/register", register);
router.post("/login", login);

router.get(
  "/me",
  authenticate,
  getMe
);
```

---

# 12. React AuthContext

The React application should have one central authentication state.

It should expose:

```ts
interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<User>;
  logout: () => void;
}
```

Components can then use:

```tsx
const {
  user,
  token,
  loading,
  login,
  logout,
} = useAuth();
```

This prevents every page from implementing authentication independently.

---

# 13. Persisting Authentication

After login:

```text
JWT
 ↓
localStorage
 ↓
accessToken
```

For the current implementation:

```ts
localStorage.setItem(
  "accessToken",
  data.token
);
```

When React starts:

```text
Read accessToken
      ↓
Token exists?
      ↓
GET /api/auth/me
      ↓
Valid?
   ↙     ↘
 yes      no
  ↓        ↓
restore   clear token
 user
```

This allows the user to remain logged in after a browser refresh.

> Security note: localStorage is convenient for a first implementation, but a production authentication architecture can use secure, HttpOnly cookies and refresh-token/session handling to reduce token exposure to JavaScript.

---

# 14. Protected React Routes

React should prevent unauthenticated users from accessing protected pages.

Example:

```tsx
<Route element={<ProtectedRoute />}>
  ...
</Route>
```

`ProtectedRoute` checks:

```text
Loading?
  ↓
Show loading UI

No user?
  ↓
Redirect to /login

User exists?
  ↓
Render protected page
```

Important:

> React route protection is primarily navigation/UX protection. It is not the backend security boundary.

The backend must independently authenticate and authorize API requests.

---

# 15. Role-Based React Routes

Use a separate `RoleRoute`.

Example:

```tsx
<Route element={
  <RoleRoute allowedRoles={["ADMIN"]} />
}>
  <Route
    path="/admin"
    element={<AdminDashboard />}
  />
</Route>
```

Role mapping:

```text
ADMIN
  → /admin

TEACHER
  → /teacher

STUDENT
  → /student

PARENT
  → /parent
```

A logged-in student visiting:

```text
/teacher
```

should be redirected to:

```text
/unauthorized
```

---

# 16. Recommended React Routing

```tsx
<BrowserRouter>
  <Routes>

    {/* Public */}
    <Route
      path="/login"
      element={<Login />}
    />

    <Route
      path="/unauthorized"
      element={<Unauthorized />}
    />

    {/* Authenticated */}
    <Route element={<ProtectedRoute />}>

      {/* Admin */}
      <Route element={
        <RoleRoute allowedRoles={["ADMIN"]} />
      }>
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
      </Route>

      {/* Teacher */}
      <Route element={
        <RoleRoute allowedRoles={["TEACHER"]} />
      }>
        <Route
          path="/teacher"
          element={<TeacherDashboard />}
        />
      </Route>

      {/* Student */}
      <Route element={
        <RoleRoute allowedRoles={["STUDENT"]} />
      }>
        <Route
          path="/student"
          element={<StudentDashboard />}
        />
      </Route>

      {/* Parent */}
      <Route element={
        <RoleRoute allowedRoles={["PARENT"]} />
      }>
        <Route
          path="/parent"
          element={<ParentDashboard />}
        />
      </Route>

    </Route>

  </Routes>
</BrowserRouter>
```

---

# 17. Login Flow

The login page should use `AuthContext` rather than calling the authentication API directly.

Flow:

```text
Login.tsx
   ↓
useAuth()
   ↓
login(email, password)
   ↓
POST /api/auth/login
   ↓
JWT + user
   ↓
AuthContext updates
   ↓
Navigate according to role
```

Role-based navigation:

```ts
switch (user.role) {
  case "ADMIN":
    navigate("/admin");
    break;

  case "TEACHER":
    navigate("/teacher");
    break;

  case "STUDENT":
    navigate("/student");
    break;

  case "PARENT":
    navigate("/parent");
    break;
}
```

---

# 18. Dashboard Ideas

## Admin Dashboard

Potential sections:

```text
Dashboard
├── Overview
├── Users
│   ├── All Users
│   ├── Teachers
│   ├── Students
│   └── Parents
├── Classes
├── Subjects
├── Academic Years
├── Reports
├── Announcements
└── Settings
```

Useful statistics:

- Total students
- Total teachers
- Total parents
- Total classes
- Attendance overview
- Recent registrations
- Recent announcements

---

# 19. Teacher Dashboard

Potential sections:

```text
Teacher Dashboard
├── Overview
├── My Classes
├── Students
├── Attendance
├── Assignments
├── Submissions
├── Grades
├── Announcements
└── Profile
```

Teacher capabilities:

### Classes
- View assigned classes
- View class students
- View subjects taught

### Attendance
- Mark attendance
- Edit attendance
- View attendance history
- View attendance summaries

### Assignments
- Create assignment
- Set due date
- Add instructions
- Attach files
- View submissions
- Grade submissions

### Grades
- Enter marks
- Update marks
- Add remarks
- View student performance

---

# 20. Student Dashboard

Potential sections:

```text
Student Dashboard
├── Overview
├── My Classes
├── Subjects
├── Assignments
├── Submissions
├── Grades
├── Attendance
├── Announcements
└── Profile
```

Student capabilities:

### Classes
- View enrolled classes
- View subjects
- View teachers

### Assignments
- View pending assignments
- View completed assignments
- Submit assignments
- See due dates
- See grades/feedback

### Grades
- View subject-wise grades
- View assignment marks
- View teacher feedback

### Attendance
- View attendance percentage
- View attendance history

---

# 21. Parent Dashboard

Potential sections:

```text
Parent Dashboard
├── Overview
├── My Children
├── Attendance
├── Assignments
├── Grades
├── Announcements
├── Teacher Communication
└── Profile
```

Parent capabilities:

- View linked children
- View attendance
- View grades
- View assignment status
- View teacher feedback
- Receive school announcements
- Communicate with teachers

A parent may eventually have multiple children:

```text
Parent
 ├── Child 1
 ├── Child 2
 └── Child 3
```

---

# 22. Common Dashboard Layout

Instead of duplicating navigation in every dashboard, create a common layout:

```text
DashboardLayout
├── Sidebar
├── Header
└── Main Content
```

Suggested structure:

```text
src/components/layout/
├── DashboardLayout.tsx
├── Sidebar.tsx
├── Header.tsx
└── PageContainer.tsx
```

The sidebar can change based on role.

Example:

```text
ADMIN
  → Users
  → Classes
  → Subjects
  → Reports

TEACHER
  → Classes
  → Students
  → Attendance
  → Assignments
  → Grades

STUDENT
  → Classes
  → Assignments
  → Grades
  → Attendance

PARENT
  → Children
  → Attendance
  → Assignments
  → Grades
```

---

# 23. Database Design Ideas

The initial `users` table can be expanded with role-specific entities.

Possible tables:

```text
users
teachers
students
parents
parent_students
classes
subjects
class_students
teacher_classes
attendance
assignments
assignment_submissions
grades
announcements
messages
```

---

# 24. Users

Basic user account:

```text
users
------
id
email
password_hash
role
created_at
updated_at
```

---

# 25. Teacher Profile

Separate teacher profile data from authentication data.

Possible fields:

```text
teachers
--------
id
user_id
first_name
last_name
phone
employee_id
department
joining_date
```

Relationship:

```text
users
  │
  └── teachers
```

---

# 26. Student Profile

```text
students
--------
id
user_id
first_name
last_name
student_id
date_of_birth
phone
class_id
```

The student's authentication identity remains in `users`.

Student-specific information remains in `students`.

---

# 27. Parent Profile

```text
parents
-------
id
user_id
first_name
last_name
phone
```

A parent-child relationship should use a join table:

```text
parent_students
---------------
parent_id
student_id
relationship
```

This allows one parent to have multiple children and potentially multiple parents/guardians per student.

---

# 28. Classes

```text
classes
-------
id
name
grade
section
academic_year
created_at
```

Example:

```text
Grade 8 - A
Grade 8 - B
Grade 9 - A
```

---

# 29. Subjects

```text
subjects
--------
id
name
code
```

Examples:

```text
Mathematics
Science
English
History
Computer Science
```

---

# 30. Class/Student Relationship

Use a join table when a student can be enrolled in classes over time:

```text
class_students
--------------
class_id
student_id
academic_year
```

This is more flexible than putting only `class_id` directly on a student.

---

# 31. Teacher/Class Relationship

Teachers can teach multiple classes and classes can have multiple teachers.

```text
teacher_classes
---------------
teacher_id
class_id
subject_id
```

This can represent:

```text
Teacher A → Grade 8A → Mathematics
Teacher A → Grade 8B → Mathematics
Teacher B → Grade 8A → Science
```

---

# 32. Attendance

Possible structure:

```text
attendance
----------
id
student_id
class_id
date
status
marked_by
created_at
```

Status could be:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

Teacher workflow:

```text
Teacher
  ↓
Select class
  ↓
Select date
  ↓
List students
  ↓
Mark attendance
  ↓
Save
```

---

# 33. Assignments

```text
assignments
-----------
id
teacher_id
class_id
subject_id
title
description
due_date
created_at
updated_at
```

Teacher creates an assignment.

Students see it in their dashboard.

---

# 34. Assignment Submissions

```text
assignment_submissions
----------------------
id
assignment_id
student_id
content
submitted_at
status
```

Possible statuses:

```text
PENDING
SUBMITTED
LATE
GRADED
```

---

# 35. Grades

Possible structure:

```text
grades
------
id
student_id
assignment_id
teacher_id
marks
max_marks
feedback
created_at
updated_at
```

This allows students and parents to see:

```text
Assignment
    ↓
Marks
    ↓
Teacher feedback
```

---

# 36. Announcements

```text
announcements
-------------
id
title
content
created_by
target_role
class_id
created_at
```

Possible targets:

```text
ALL
TEACHER
STUDENT
PARENT
CLASS
```

---

# 37. Messaging

A future messaging system could use:

```text
conversations
messages
conversation_participants
```

Possible use cases:

```text
Teacher ↔ Student
Teacher ↔ Parent
Admin ↔ Teacher
Admin ↔ Parent
```

---

# 38. API Structure

A future REST API could look like:

```text
/api/auth
/api/users
/api/teachers
/api/students
/api/parents
/api/classes
/api/subjects
/api/attendance
/api/assignments
/api/submissions
/api/grades
/api/announcements
/api/messages
```

---

# 39. Example Protected APIs

Admin-only:

```text
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

Teacher/admin:

```text
GET  /api/classes
GET  /api/classes/:id/students
POST /api/attendance
POST /api/assignments
POST /api/grades
```

Student:

```text
GET  /api/student/classes
GET  /api/student/assignments
POST /api/student/assignments/:id/submit
GET  /api/student/grades
GET  /api/student/attendance
```

Parent:

```text
GET /api/parent/children
GET /api/parent/children/:id/attendance
GET /api/parent/children/:id/grades
GET /api/parent/children/:id/assignments
```

Every protected endpoint should perform backend authentication and appropriate authorization.

---

# 40. API Client

Instead of repeating `fetch()` everywhere, create a central API client.

Possible structure:

```text
src/services/
├── api.ts
├── authApi.ts
├── usersApi.ts
├── classesApi.ts
├── attendanceApi.ts
├── assignmentsApi.ts
└── gradesApi.ts
```

Example:

```ts
const API_URL = "http://localhost:3000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...options.headers,
      },
    }
  );

  return response;
}
```

This gives the frontend one place to handle authentication headers.

---

# 41. Environment Variables

Frontend:

```text
VITE_API_URL=http://localhost:3000
```

Then:

```ts
const API_URL = import.meta.env.VITE_API_URL;
```

Backend:

```text
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

Do not commit `.env` files containing real credentials.

---

# 42. Error Handling

Backend should use consistent responses.

Example:

```json
{
  "message": "Invalid email or password"
}
```

Validation errors can return structured information.

Frontend should display useful messages without exposing internal errors.

Examples:

```text
Invalid email or password
Authentication required
You do not have permission to access this resource
Something went wrong. Please try again.
```

---

# 43. Loading States

The frontend should distinguish between:

```text
Loading authentication
Loading dashboard
Loading table
Submitting form
Saving attendance
Uploading assignment
```

Avoid showing stale data while loading a newly selected resource.

A proper loading indicator should be displayed where appropriate.

---

# 44. Authentication Testing Checklist

## Login

- [ ] Correct email/password logs in
- [ ] Incorrect password returns error
- [ ] Unknown email returns error
- [ ] JWT is returned
- [ ] User information is returned

## `/me`

- [ ] Valid JWT works
- [ ] Missing JWT returns 401
- [ ] Invalid JWT returns 401
- [ ] Expired JWT returns 401

## React

- [ ] Login page works
- [ ] Token is persisted
- [ ] Browser refresh restores session
- [ ] Logout clears authentication
- [ ] Protected pages redirect logged-out users
- [ ] Role routes reject incorrect roles

## Backend authorization

- [ ] Admin can access admin APIs
- [ ] Teacher can access teacher APIs
- [ ] Student cannot access teacher-only APIs
- [ ] Parent cannot access admin-only APIs
- [ ] Unauthorized role returns 403

---

# 45. Current Authentication Milestone

The authentication flow has now reached this point:

```text
                    REGISTER
                       │
                       ▼
                  PostgreSQL
                       │
                       ▼
                     LOGIN
                       │
                       ▼
                  bcrypt check
                       │
                       ▼
                     JWT
                       │
                       ▼
                React AuthContext
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        localStorage          user state
             │                   │
             └─────────┬─────────┘
                       ▼
                   /api/auth/me
                       │
                       ▼
                Session restored
```

The next implementation milestone is role-based application navigation and the actual school-management APIs.

---

# 46. Recommended Development Order

Build the application incrementally.

## Phase 1 — Authentication

- [x] PostgreSQL connection
- [x] User schema
- [x] Register API
- [x] Login API
- [x] bcrypt password hashing
- [x] JWT creation
- [x] Authentication middleware
- [x] Role middleware
- [x] React Login
- [ ] `/me`
- [ ] AuthContext
- [ ] ProtectedRoute
- [ ] RoleRoute
- [ ] Logout
- [ ] Unauthorized page

## Phase 2 — Application Shell

- [ ] Dashboard layout
- [ ] Header
- [ ] Sidebar
- [ ] Role-specific navigation
- [ ] Loading states
- [ ] Error handling
- [ ] API client

## Phase 3 — User Management

- [ ] Admin user list
- [ ] Create user
- [ ] Edit user
- [ ] Disable/delete user
- [ ] Teacher profiles
- [ ] Student profiles
- [ ] Parent profiles

## Phase 4 — Academic Structure

- [ ] Classes
- [ ] Subjects
- [ ] Student enrollment
- [ ] Teacher assignments
- [ ] Academic years

## Phase 5 — Attendance

- [ ] Teacher attendance UI
- [ ] Attendance API
- [ ] Attendance history
- [ ] Student attendance view
- [ ] Parent attendance view
- [ ] Attendance summaries

## Phase 6 — Assignments

- [ ] Create assignment
- [ ] Assignment list
- [ ] Student submission
- [ ] Submission tracking
- [ ] Teacher grading
- [ ] Student feedback

## Phase 7 — Grades

- [ ] Grade entry
- [ ] Grade editing
- [ ] Student grade view
- [ ] Parent grade view
- [ ] Performance summaries

## Phase 8 — Communication

- [ ] Announcements
- [ ] Role/class targeting
- [ ] Teacher-parent messaging
- [ ] Notifications

## Phase 9 — Reports

- [ ] Attendance reports
- [ ] Grade reports
- [ ] Student performance
- [ ] Teacher/class reports
- [ ] Export functionality

---

# 47. Security Principles

The application should follow these principles:

1. Never store plaintext passwords.
2. Hash passwords with bcrypt.
3. Never trust a role supplied by the React frontend.
4. Always determine authorization on the backend.
5. Validate API input with Zod.
6. Use parameterized/ORM database queries.
7. Keep secrets in environment variables.
8. Never expose `passwordHash` through API responses.
9. Validate ownership as well as role.

For example, a student being a `STUDENT` is not enough to access any student's grades.

The backend should verify:

```text
Is authenticated?
        ↓
Is STUDENT?
        ↓
Does this grade belong to this student?
        ↓
Allow
```

Similarly, a parent should only be able to access children actually linked to that parent.

---

# 48. Important Authorization Concept

Role-based authorization alone is not enough.

There are two levels:

### Role authorization

```text
Is this a TEACHER?
```

### Resource authorization

```text
Is this teacher assigned to this class?
```

For example:

```text
Teacher A
   ↓
GET /api/classes/123/students
```

The backend should verify that Teacher A is actually assigned to class `123`.

Likewise:

```text
Parent A
   ↓
GET /api/students/999/grades
```

should only succeed if student `999` is actually linked to Parent A.

This prevents horizontal privilege escalation.

---

# 49. Suggested UI Experience

The application can eventually have a clean dashboard experience:

```text
┌─────────────────────────────────────────────┐
│ Logo                         User ▼         │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Dashboard    │  Welcome back!              │
│              │                              │
│ Classes      │  ┌──────┐ ┌──────┐          │
│ Students     │  │ 120  │ │  8   │          │
│ Attendance   │  │Students│Classes│          │
│ Assignments  │  └──────┘ └──────┘          │
│ Grades       │                              │
│ Reports      │  Recent activity             │
│              │                              │
│ Settings     │                              │
│ Logout       │                              │
└──────────────┴──────────────────────────────┘
```

Each role gets its own relevant navigation and dashboard data.

---

# 50. Long-Term Feature Ideas

Possible future features:

- Calendar
- Timetable
- Exam schedules
- Online exams
- Report cards
- Certificates
- Fee management
- School announcements
- Notifications
- Email notifications
- File/document management
- Teacher-parent messaging
- Student progress charts
- Class performance analytics
- Assignment attachments
- Profile photos
- Academic year management
- Multiple schools/tenants
- Audit logs
- Admin activity tracking
- Search and filtering
- Pagination
- CSV/Excel exports
- PDF reports

---

# 51. Recommended Immediate Next Steps

The immediate implementation sequence should be:

```text
1. Implement GET /api/auth/me
           ↓
2. Implement React AuthContext
           ↓
3. Persist JWT
           ↓
4. Restore session after refresh
           ↓
5. Implement ProtectedRoute
           ↓
6. Implement RoleRoute
           ↓
7. Implement Unauthorized page
           ↓
8. Create Admin/Teacher/Student/Parent dashboards
           ↓
9. Create shared DashboardLayout
           ↓
10. Create centralized API client
           ↓
11. Build Admin user management
           ↓
12. Build classes/subjects
           ↓
13. Build attendance
           ↓
14. Build assignments
           ↓
15. Build grades
           ↓
16. Build parent/student views
           ↓
17. Build announcements/messaging
```

This order keeps authentication and authorization solid before adding the actual school-management functionality.

---

# 52. Development Philosophy

Keep responsibilities separated.

### React

Responsible for:

- UI
- Navigation
- Forms
- Loading states
- Displaying data
- Client-side route protection

### Express

Responsible for:

- API endpoints
- Authentication
- Authorization
- Validation
- Business logic orchestration

### Services

Responsible for:

- Application/business logic
- Database operations
- Reusable operations

### PostgreSQL

Responsible for:

- Persistent data
- Relationships
- Constraints
- Referential integrity

The frontend should never be trusted to enforce security rules by itself.

---

# 53. Final Target Architecture

```text
                         ┌──────────────────┐
                         │   React + Vite   │
                         └────────┬─────────┘
                                  │
                     ┌────────────▼────────────┐
                     │     AuthContext         │
                     │ JWT + Current User      │
                     └────────────┬────────────┘
                                  │
                 ┌────────────────▼────────────────┐
                 │       React Router              │
                 │ ProtectedRoute + RoleRoute      │
                 └────────────────┬────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
       ADMIN                   TEACHER                  STUDENT
     Dashboard                Dashboard                Dashboard
          │                       │                        │
          └───────────────────────┼────────────────────────┘
                                  │
                                  ▼
                         REST API / Express
                                  │
                         ┌────────▼────────┐
                         │ Authentication  │
                         │ Authorization   │
                         │ Validation      │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │   Controllers   │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │    Services     │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │ Drizzle ORM     │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │  PostgreSQL     │
                         └─────────────────┘
```

The goal is to build the system incrementally, keeping authentication, authorization, database relationships, and role-specific functionality clearly separated so that the application remains maintainable as features grow.
