import { and, count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { auditLogs, classEnrollments, classes, users } from "../db/schema.js";

export async function enrollStudent(studentId: string, classId: string, actorId?: string) {
    return db.transaction(async (tx) => {
        const [classRecord] = await tx
            .select({ id: classes.id, capacity: classes.capacity })
            .from(classes)
            .where(eq(classes.id, classId))
            .for("update")
            .limit(1);
        if (!classRecord) throw new Error("Class not found");

        const [student] = await tx
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.id, studentId))
            .limit(1);
        if (!student) throw new Error("Student not found");
        if (student.role !== "STUDENT") throw new Error("User is not a student");

        const [existing] = await tx
            .select({ id: classEnrollments.id })
            .from(classEnrollments)
            .where(and(
                eq(classEnrollments.studentId, studentId),
                eq(classEnrollments.classId, classId),
            ))
            .limit(1);
        if (existing) throw new Error("Student is already enrolled in this class");

        const [enrollmentCount] = await tx
            .select({ total: count() })
            .from(classEnrollments)
            .where(eq(classEnrollments.classId, classId));
        if ((enrollmentCount?.total ?? 0) >= classRecord.capacity) {
            throw new Error("Class is at capacity");
        }

        const [enrollment] = await tx
            .insert(classEnrollments)
            .values({ studentId, classId })
            .returning();
        if (!enrollment) throw new Error("Could not create class enrollment");
        if (actorId) await tx.insert(auditLogs).values({
            actorId,
            action: "STUDENT_ENROLLED",
            entityType: "CLASS_ENROLLMENT",
            entityId: enrollment.id,
            metadata: { classId, studentId },
        });
        return enrollment;
    });
}

