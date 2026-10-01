import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type UserRole =
    | "ADMIN"
    | "TEACHER"
    | "STUDENT"
    | "PARENT";

type ProtectedRouteProps = {
    children?: ReactNode;
    allowedRoles?: UserRole[];
};

export default function ProtectedRoute({
    children,
    allowedRoles,
}: ProtectedRouteProps) {
    const { user } = useAuth();
    const location = useLocation();

    // Not logged in
    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    // Logged in but wrong role
    if (
        allowedRoles &&
        !allowedRoles.includes(user.role as UserRole)
    ) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Supports both:
    // <ProtectedRoute>...</ProtectedRoute>
    // and
    // <Route element={<ProtectedRoute />} />
    return children ? <>{children}</> : <Outlet />;
}