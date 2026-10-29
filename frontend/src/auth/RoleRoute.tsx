import type { RoleRouteProps } from "../types/RoleRoute.ts";
import type { UserRole } from "../types/AuthContext.ts";
import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  useAuth,
} from "./AuthContext";


export default function RoleRoute({
  allowedRoles,
}: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
