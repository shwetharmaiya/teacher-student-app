import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { createToken } from "../../utils/jwt.js";

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function registerUser(
    email: string,
    password: string,
    role: UserRole,
) {
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

    if (existingUser.length > 0) {
        throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
        .insert(users)
        .values({
            email,
            passwordHash,
            role,
        })
        .returning({
            id: users.id,
            email: users.email,
            role: users.role,
        });

    return user;
}

export async function loginUser(email: string, password: string) {
    const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    const user = result[0];

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
        throw new Error("Invalid email or password");
    }

    const token = createToken({
        userId: user.id,
        role: user.role,
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    };
}

export async function getUserById(userId: string) {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
}
