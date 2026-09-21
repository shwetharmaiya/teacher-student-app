import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { classEnrollments, classes, users } from "../../db/schema.js";

export type ClassInput = {
    grade: string;
    section: string;
    teacherName?: string | undefined;
    teacherId?: string | undefined;
    room: string;
    capacity: number;
};

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
        .groupBy(
            classes.id,
            classes.grade,
            classes.section,
            classes.teacherName,
            classes.teacherId,
            classes.room,
            classes.capacity,
            classes.createdAt,
            classes.updatedAt,
        )
        .orderBy(asc(classes.grade), asc(classes.section));
}

export async function createClass(input: ClassInput) {
    const [createdClass] = await db.insert(classes).values(input).returning();
    return createdClass;
}

export async function updateClass(id: string, input: ClassInput) {
    const [updatedClass] = await db
        .update(classes)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(classes.id, id))
        .returning();

    return updatedClass ?? null;
}

export async function deleteClass(id: string) {
    const [deletedClass] = await db
        .delete(classes)
        .where(eq(classes.id, id))
        .returning({ id: classes.id });

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

export async function addEnrollment(classId: string, studentId: string) {
    const [enrollment] = await db.insert(classEnrollments)
        .values({ classId, studentId })
        .onConflictDoNothing()
        .returning();
    return enrollment ?? null;
}

export async function removeEnrollment(classId: string, studentId: string) {
    const [enrollment] = await db.delete(classEnrollments)
        .where(and(
            eq(classEnrollments.classId, classId),
            eq(classEnrollments.studentId, studentId),
        ))
        .returning({ id: classEnrollments.id });
    return enrollment ?? null;
}
