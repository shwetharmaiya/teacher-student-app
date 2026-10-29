import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db/index.js";
import { parentStudentLinks, users } from "../../db/schema.js";

const parentUser = alias(users, "parent_user");
const studentUser = alias(users, "student_user");

export async function listParentLinks() {
    return db.select({
        id: parentStudentLinks.id,
        parentId: parentStudentLinks.parentId,
        parentEmail: parentUser.email,
        studentId: parentStudentLinks.studentId,
        studentEmail: studentUser.email,
        verifiedBy: parentStudentLinks.verifiedBy,
        verifiedAt: parentStudentLinks.verifiedAt,
        createdAt: parentStudentLinks.createdAt,
    }).from(parentStudentLinks)
        .innerJoin(parentUser, eq(parentStudentLinks.parentId, parentUser.id))
        .innerJoin(studentUser, eq(parentStudentLinks.studentId, studentUser.id))
        .orderBy(asc(parentUser.email), asc(studentUser.email));
}

export async function createParentLink(parentId: string, studentId: string, adminId: string) {
    if (parentId === studentId) throw new Error("Parent and student accounts must be different");
    return db.transaction(async (tx) => {
        const targets = await tx.select({ id: users.id, role: users.role }).from(users)
            .where(inArray(users.id, [parentId, studentId])).for("update");
        const parent = targets.find((target) => target.id === parentId);
        const student = targets.find((target) => target.id === studentId);
        if (!parent || parent.role !== "PARENT") throw new Error("Select an account with the PARENT role");
        if (!student || student.role !== "STUDENT") throw new Error("Select an account with the STUDENT role");
        const [admin] = await tx.select({ role: users.role }).from(users).where(eq(users.id, adminId)).for("update").limit(1);
        if (!admin || admin.role !== "ADMIN") throw new Error("Only an administrator can verify parent links");
        const [link] = await tx.insert(parentStudentLinks).values({ parentId, studentId, verifiedBy: adminId })
            .onConflictDoNothing({ target: [parentStudentLinks.parentId, parentStudentLinks.studentId] })
            .returning();
        return link ?? null;
    });
}

export async function deleteParentLink(linkId: string) {
    const [deleted] = await db.delete(parentStudentLinks).where(eq(parentStudentLinks.id, linkId))
        .returning({ id: parentStudentLinks.id });
    return deleted ?? null;
}
