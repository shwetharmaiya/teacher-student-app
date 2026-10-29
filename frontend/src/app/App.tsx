import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";
import RoleRoute from "../auth/RoleRoute";

import Login from "../pages/Login/LoginPage";
import Unauthorized from "./../pages/Unauthorized";
import Register from "./../pages/auth/Register";
import UsersPage from "../pages/admin/UsersPage";
import SubjectsPage from "../pages/admin/SubjectsPage";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ClassesPage from "../pages/admin/ClassesPage";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherClassesPage from "../pages/teacher/TeacherClassesPage";
import StudentDashboard from "../pages/student/StudentDashboard";
import ParentDashboard from "../pages/parent/ParentDashboard";
import RoleFeaturePage from "../pages/RoleFeaturePage";
import AppLayout from "../components/layout/AppLayout";
import RoleHomeRedirect from "../auth/RoleHomeRedirect";
import TeachingAssignmentsPage from "../pages/admin/TeachingAssignmentsPage";
import TeacherTeachingPage from "../pages/teacher/TeacherTeachingPage";
import TeacherClassWorkspacePage from "../pages/teacher/TeacherClassWorkspacePage";
import StudentAssignmentsPage from "../pages/student/StudentAssignmentsPage";
import StudentAssignmentDetailsPage from "../pages/student/StudentAssignmentDetailsPage";
import StudentClassesPage from "../pages/student/StudentClassesPage";
import StudentAttendancePage from "../pages/student/StudentAttendancePage";
import ParentLinksPage from "../pages/admin/ParentLinksPage";
import ParentChildrenPage from "../pages/parent/ParentChildrenPage";
import ParentRecordsPage from "../pages/parent/ParentRecordsPage";
import StudentGradesPage from "../pages/student/StudentGradesPage";
import TeacherSubmissionsPage from "../pages/teacher/TeacherSubmissionsPage";
import "../index.css";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<RoleHomeRedirect />} />
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* All authenticated users */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route
                                path="/admin/users"
                                element={<UsersPage />}
                            />
                            <Route
                                path="/admin/classes"
                                element={<ClassesPage />}
                            />
                            <Route
                                path="/admin/subjects"
                                element={<SubjectsPage />}
                            />
                            <Route
                                path="/admin/teaching-assignments"
                                element={<TeachingAssignmentsPage />}
                            />
                            <Route path="/admin/parent-links" element={<ParentLinksPage />} />
                        </Route>

                        <Route
                            element={<RoleRoute allowedRoles={["TEACHER"]} />}
                        >
                            <Route
                                path="/teacher"
                                element={<TeacherDashboard />}
                            />
                            <Route
                                path="/teacher/classes"
                                element={<TeacherClassesPage />}
                            />
                            <Route
                                path="/teacher/students"
                                element={
                                    <RoleFeaturePage title="My students" />
                                }
                            />
                            <Route
                                path="/teacher/attendance"
                                element={<RoleFeaturePage title="Attendance" />}
                            />
                            <Route
                                path="/teacher/assignments"
                                element={<TeacherSubmissionsPage />}
                            />
                            <Route
                                path="/teacher/marks"
                                element={<TeacherSubmissionsPage />}
                            />
                            <Route
                                path="/teacher/my-teaching"
                                element={<TeacherTeachingPage />}
                            />
                            <Route
                                path="/teacher/classes/:classId"
                                element={<TeacherClassWorkspacePage />}
                            />
                        </Route>

                        <Route
                            element={<RoleRoute allowedRoles={["STUDENT"]} />}
                        >
                            <Route
                                path="/student"
                                element={
                                    <Navigate replace to="/student/dashboard" />
                                }
                            />
                            <Route
                                path="/student/dashboard"
                                element={<StudentDashboard />}
                            />
                            <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
                            <Route path="/student/assignments/:assignmentId" element={<StudentAssignmentDetailsPage />} />
                            <Route
                                path="/student/classes"
                                element={<StudentClassesPage />}
                            />
                            <Route
                                path="/student/marks"
                                element={<StudentGradesPage />}
                            />
                            <Route
                                path="/student/attendance"
                                element={<StudentAttendancePage />}
                            />
                           
                        </Route>
                        

                        <Route
                            element={<RoleRoute allowedRoles={["PARENT"]} />}
                        >
                            <Route
                                path="/parent"
                                element={
                                    <Navigate replace to="/parent/dashboard" />
                                }
                            />
                            <Route
                                path="/parent/dashboard"
                                element={<ParentDashboard />}
                            />
                            <Route
                                path="/parent/children"
                                element={<ParentChildrenPage />}
                            />
                            <Route
                                path="/parent/attendance"
                                element={<ParentRecordsPage type="attendance" />}
                            />
                            <Route path="/parent/assignments" element={<ParentRecordsPage type="assignments" />} />
                            <Route
                                path="/parent/marks"
                                element={<ParentRecordsPage type="grades" />}
                            />
                        </Route>
                    </Route>
                </Route>
                <Route path="*" element={<RoleHomeRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}

