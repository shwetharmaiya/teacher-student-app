import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./../middleware/auth.middleware.js";
import type { UserRole } from "../modules/auth/auth.service.js";

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}