import type { ReactNode } from "react";
import type { UserRole } from "./AuthContext";

export type ProtectedRouteProps = {
    children?: ReactNode;
    allowedRoles?: UserRole[];
};
