import bcrypt from "bcrypt";
import { timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { createToken } from "../../utils/jwt.js";

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export class ProvisioningError extends Error {
    constructor(message: string, readonly statusCode: number) {
        super(message);
        this.name = "ProvisioningError";
    }
}

export async function bootstrapAdminAccount(input: {
    email: string;
    password: string;
    bootstrapKey: string;
}) {
    const configuredKey = process.env.BOOTSTRAP_ADMIN_KEY;
    if (!configuredKey) {
        throw new ProvisioningError("Admin bootstrap is not configured", 503);
    }
    const expected = Buffer.from(configuredKey);
    const provided = Buffer.from(input.bootstrapKey);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        throw new ProvisioningError("Invalid bootstrap key", 401);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    return db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(72819401)`);
        const existingAdmin = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, "ADMIN"))
            .limit(1);
        if (existingAdmin.length) {
            throw new ProvisioningError("An administrator already exists", 409);
        }

        const [user] = await tx
            .insert(users)
            .values({ email: input.email.trim().toLowerCase(), passwordHash, role: "ADMIN" })
            .onConflictDoNothing({ target: users.email })
            .returning({ id: users.id, email: users.email, role: users.role });
        if (!user) throw new ProvisioningError("An account with this email already exists", 409);
        return user;
    });
}

export async function loginUser(email: string, password: string) {
    const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);
    const user = result[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new Error("Invalid email or password");
    }

    const token = createToken({ userId: user.id, role: user.role, tokenVersion: user.updatedAt.toISOString() });
    return {
        token,
        user: { id: user.id, email: user.email, role: user.role },
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


