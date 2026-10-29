import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs, classEnrollments, classes, users } from "../../db/schema.js";
import { enrollStudent } from "../../services/classEnrollment.service.js";

export type ClassInput = {
    grade: string;
    section: string;
    teacherName?: string | null | undefined;
    teacherId?: string | null | undefined;
    room: string;
    capacity: number;
};

async function requireTeacher(teacherId?: string | null) {
    if (!teacherId) return;
    const [teacher] = await db.select({ role: users.role }).from(users).where(eq(users.id, teacherId)).limit(1);
    if (!teacher || teacher.role !== "TEACHER") throw new Error("Select a registered teacher account");
}

export async function listClasses() {
    return db.select({
        id: classes.id,
        grade: classes.grade,
        section: classes.section,
        teacherName: classes.teacherName,
        teacherId: classes.teacherId,
        room: classes.room,
        capacity: classes.capacity,
        studentCount: count(classEnrollments.id),
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
    })
        .from(classes)
        .leftJoin(classEnrollments, eq(classEnrollments.classId, classes.id))
        .groupBy(classes.id, classes.grade, classes.section, classes.teacherName, classes.teacherId, classes.room, classes.capacity, classes.createdAt, classes.updatedAt)
        .orderBy(asc(classes.grade), asc(classes.section));
}

export async function createClass(input: ClassInput) {
    await requireTeacher(input.teacherId);
    const [createdClass] = await db.insert(classes).values(input).returning();
    return createdClass;
}

export async function updateClass(id: string, input: ClassInput) {
    await requireTeacher(input.teacherId);
    return db.transaction(async (tx) => {
        const [existingClass] = await tx.select({ id: classes.id, capacity: classes.capacity }).from(classes)
            .where(eq(classes.id, id)).for("update").limit(1);
        if (!existingClass) return null;

        const [enrollmentCount] = await tx.select({ total: count() }).from(classEnrollments)
            .where(eq(classEnrollments.classId, id));
        if (input.capacity < (enrollmentCount?.total ?? 0)) {
            throw new Error("Capacity cannot be lower than the current enrollment");
        }

        const [updatedClass] = await tx.update(classes)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(classes.id, id))
            .returning();
        return updatedClass ?? null;
    });
}

export async function deleteClass(id: string) {
    const [deletedClass] = await db.delete(classes).where(eq(classes.id, id)).returning({ id: classes.id });
    return deletedClass ?? null;
}

export async function listSchoolPeople() {
    return db.select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(inArray(users.role, ["TEACHER", "STUDENT"]))
        .orderBy(asc(users.email));
}

export async function getClassEnrollments(classId: string) {
    return db.select({ id: users.id, email: users.email })
        .from(classEnrollments)
        .innerJoin(users, eq(classEnrollments.studentId, users.id))
        .where(eq(classEnrollments.classId, classId))
        .orderBy(asc(users.email));
}

export async function addEnrollment(classId: string, studentId: string, actorId: string) {
    return enrollStudent(studentId, classId, actorId);
}

export async function removeEnrollment(classId: string, studentId: string, actorId: string) {
    return db.transaction(async (tx) => {
        const [enrollment] = await tx.delete(classEnrollments)
            .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.studentId, studentId)))
            .returning({ id: classEnrollments.id });
        if (!enrollment) return null;
        await tx.insert(auditLogs).values({
            actorId,
            action: "STUDENT_REMOVED_FROM_CLASS",
            entityType: "CLASS_ENROLLMENT",
            entityId: enrollment.id,
            metadata: { classId, studentId },
        });
        return enrollment;
    });
}

