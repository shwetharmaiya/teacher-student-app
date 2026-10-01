import { and, inArray, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assignments,
  classEnrollments,
  submissions,
} from "../db/schema.js";

export async function getStudentAssignments(studentId: string) {
  const enrollments = await db
    .select({
      classId: classEnrollments.classId,
    })
    .from(classEnrollments)
    .where(eq(classEnrollments.studentId, studentId));

  const classIds = enrollments.map(
    (enrollment) => enrollment.classId
  );

  if (classIds.length === 0) {
    return [];
  }

  const studentAssignments = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      dueAt: assignments.dueAt,
      createdAt: assignments.createdAt,
    })
    .from(assignments)
    .where(inArray(assignments.classId, classIds));

  return studentAssignments;
}

export async function submitAssignment(
  studentId: string,
  assignmentId: string,
  content: string
) {
  // 1. Check that the assignment exists
  const [assignment] = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
    })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  // 2. Check that the student belongs to this assignment's class
  const [enrollment] = await db
    .select({
      studentId: classEnrollments.studentId,
    })
    .from(classEnrollments)
    .where(
      and(
        eq(classEnrollments.studentId, studentId),
        eq(classEnrollments.classId, assignment.classId)
      )
    )
    .limit(1);

  if (!enrollment) {
    throw new Error("You are not enrolled in this class");
  }

  // 3. Check whether the student already submitted
  const [existingSubmission] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.studentId, studentId)
      )
    )
    .limit(1);

  // 4. Update existing submission
  if (existingSubmission) {
    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        content,
        submittedAt: new Date(),
        status: "SUBMITTED",
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, existingSubmission.id))
      .returning();

    return updatedSubmission;
  }

  // 5. Create new submission
  const [newSubmission] = await db
    .insert(submissions)
    .values({
      assignmentId,
      studentId,
      content,
      status: "SUBMITTED",
    })
    .returning();

  return newSubmission;
}