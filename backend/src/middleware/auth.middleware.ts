import type { Response, NextFunction } from "express";
import type { Request } from "express";
import type { JwtPayload } from "../utils/jwt.js";
import { verifyToken } from "../utils/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const [account] = await db
      .select({ id: users.id, role: users.role, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!account || account.role !== payload.role || (payload.tokenVersion && account.updatedAt.toISOString() !== payload.tokenVersion)) {
      return res.status(401).json({ message: "Account is no longer active; sign in again" });
    }
  } catch (error) {
    console.error("Authentication account lookup failed:", error);
    return res.status(503).json({ message: "Authentication service is temporarily unavailable" });
  }

  req.user = payload;
  return next();
}

