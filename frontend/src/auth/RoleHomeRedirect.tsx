import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "./AuthContext";

const homeByRole: Record<UserRole, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
};

export function roleHome(role: UserRole) {
  return homeByRole[role];
}

export default function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate replace to={user ? roleHome(user.role) : "/login"} />;
}
