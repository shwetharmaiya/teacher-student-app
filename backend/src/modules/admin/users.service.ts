import bcrypt from "bcrypt";
import { and, count, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs, users } from "../../db/schema.js";
import type { UserRole } from "../auth/auth.service.js";

type UpdateInput = { email?: string | undefined; password?: string | undefined; role?: UserRole | undefined };
export type UserSearch = { search: string; role?: UserRole | undefined; page: number; limit: number };

export async function listUsers(input: UserSearch) {
    const filters = [];
    if (input.search) filters.push(ilike(users.email, `%${input.search}%`));
    if (input.role) filters.push(eq(users.role, input.role));
    const where = filters.length ? and(...filters) : undefined;
    const [countResult] = await db.select({ total: count() }).from(users).where(where);
    const records = await db.select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
    }).from(users).where(where).orderBy(users.email).limit(input.limit).offset((input.page - 1) * input.limit);
    const total = countResult?.total ?? 0;
    return { users: records, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
}

export async function createManagedUser(input: { email: string; password: string; role: UserRole }, actorId: string) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return db.transaction(async (tx) => {
        const [user] = await tx.insert(users)
            .values({ email: input.email.trim().toLowerCase(), passwordHash, role: input.role })
            .onConflictDoNothing({ target: users.email })
            .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt });
        if (!user) return null;
        await tx.insert(auditLogs).values({
            actorId,
            action: "USER_CREATED",
            entityType: "USER",
            entityId: user.id,
            metadata: { role: user.role },
        });
        return user;
    });
}

async function makeUpdateValues(input: UpdateInput) {
    const values: { email?: string; passwordHash?: string; role?: UserRole; updatedAt: Date } = { updatedAt: new Date() };
    if (input.email !== undefined) values.email = input.email.trim().toLowerCase();
    if (input.role !== undefined) values.role = input.role;
    if (input.password !== undefined) values.passwordHash = await bcrypt.hash(input.password, 12);
    return values;
}

export async function updateManagedUser(id: string, input: UpdateInput, requesterId: string) {
    return db.transaction(async (tx) => {
        const [current] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).for("update").limit(1);
        if (!current) return null;
        if (requesterId === id && input.role && input.role !== current.role) throw new Error("You cannot change your own role");

        if (current.role === "ADMIN" && input.role && input.role !== "ADMIN") {
            await tx.execute(sql`select pg_advisory_xact_lock(72819401)`);
            const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
            if (admins.length <= 1) throw new Error("At least one administrator must remain");
        }
        const values = await makeUpdateValues(input);
        const [user] = await tx.update(users).set(values).where(eq(users.id, id)).returning({
            id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt,
        });
        if (!user) return null;
        await tx.insert(auditLogs).values({
            actorId: requesterId,
            action: "USER_UPDATED",
            entityType: "USER",
            entityId: id,
            metadata: { roleBefore: current.role, roleAfter: user.role, emailChanged: input.email !== undefined, passwordChanged: input.password !== undefined },
        });
        return user;
    });
}

export async function deleteManagedUser(id: string, requesterId: string) {
    if (id === requesterId) throw new Error("You cannot delete your own account");
    return db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(72819401)`);
        const [target] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).for("update").limit(1);
        if (!target) return null;
        if (target.role === "ADMIN") {
            const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
            if (admins.length <= 1) throw new Error("At least one administrator must remain");
        }
        await tx.insert(auditLogs).values({
            actorId: requesterId,
            action: "USER_DELETED",
            entityType: "USER",
            entityId: id,
            metadata: { role: target.role },
        });
        const [deleted] = await tx.delete(users).where(eq(users.id, id)).returning({ id: users.id });
        return deleted ?? null;
    });
}
