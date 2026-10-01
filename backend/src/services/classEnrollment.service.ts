import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  classEnrollments,
  classes,
  users,
} from "../db/schema.js";

export async function enrollStudent(
  studentId: string,
  classId: string
) {
  // Verify student exists and has STUDENT role
  const [student] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.role !== "STUDENT") {
    throw new Error("User is not a student");
  }

  // Verify class exists
  const [classRecord] = await db
    .select({
      id: classes.id,
      grade: classes.grade,
      section: classes.section,
    })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);

  if (!classRecord) {
    throw new Error("Class not found");
  }

  // Prevent duplicate enrollment
  const [existingEnrollment] = await db
    .select({
      id: classEnrollments.id,
    })
    .from(classEnrollments)
    .where(
      and(
        eq(classEnrollments.studentId, studentId),
        eq(classEnrollments.classId, classId)
      )
    )
    .limit(1);

  if (existingEnrollment) {
    throw new Error("Student is already enrolled in this class");
  }

  // Create enrollment
  const [enrollment] = await db
    .insert(classEnrollments)
    .values({
      studentId,
      classId,
    })
    .returning();

  return enrollment;
}