import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  tokenVersion?: string;
}

export function createToken(payload: JwtPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
