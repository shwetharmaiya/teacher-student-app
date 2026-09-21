import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";
import RoleRoute from "../auth/RoleRoute";

import Login from "../pages/Login/LoginPage";
import Unauthorized from "./../pages/Unauthorized";
import Register from "./../pages/auth/Register";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ClassesPage from "../pages/admin/ClassesPage";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherClassesPage from "../pages/teacher/TeacherClassesPage";
import StudentDashboard from "../pages/student/StudentDashboard";
import ParentDashboard from "../pages/parent/ParentDashboard";
import RoleFeaturePage from "../pages/RoleFeaturePage";
import AppLayout from "../components/layout/AppLayout";
import RoleHomeRedirect from "../auth/RoleHomeRedirect";
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
                        <Route path="/admin/users" element={<RoleFeaturePage title="User management" />} />
                        <Route path="/admin/classes" element={<ClassesPage />} />
                        <Route path="/admin/subjects" element={<RoleFeaturePage title="Subjects" />} />
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["TEACHER"]} />}>
                        <Route path="/teacher" element={<TeacherDashboard />} />
                        <Route path="/teacher/classes" element={<TeacherClassesPage />} />
                        <Route path="/teacher/students" element={<RoleFeaturePage title="My students" />} />
                        <Route path="/teacher/attendance" element={<RoleFeaturePage title="Attendance" />} />
                        <Route path="/teacher/assignments" element={<RoleFeaturePage title="Assignments" />} />
                        <Route path="/teacher/marks" element={<RoleFeaturePage title="Marks" />} />
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["STUDENT"]} />}>
                        <Route path="/student" element={<Navigate replace to="/student/dashboard" />} />
                        <Route path="/student/dashboard" element={<StudentDashboard />} />
                        <Route path="/student/classes" element={<RoleFeaturePage title="My classes" />} />
                        <Route path="/student/assignments" element={<RoleFeaturePage title="Assignments" />} />
                        <Route path="/student/marks" element={<RoleFeaturePage title="Marks" />} />
                        <Route path="/student/attendance" element={<RoleFeaturePage title="Attendance" />} />
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["PARENT"]} />}>
                        <Route path="/parent" element={<Navigate replace to="/parent/dashboard" />} />
                        <Route path="/parent/dashboard" element={<ParentDashboard />} />
                        <Route path="/parent/children" element={<RoleFeaturePage title="My children" />} />
                        <Route path="/parent/attendance" element={<RoleFeaturePage title="Attendance" />} />
                        <Route path="/parent/marks" element={<RoleFeaturePage title="Marks" />} />
                    </Route>
                    </Route>
                </Route>
                <Route path="*" element={<RoleHomeRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}
