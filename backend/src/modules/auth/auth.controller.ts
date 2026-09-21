import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { getUserById } from "./auth.service.js";

export async function getMe(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const user = await getUserById(req.user.userId);

  if (!user) {
    return res.status(401).json({
      message: "User no longer exists",
    });
  }

  return res.json({
    user,
  });
}