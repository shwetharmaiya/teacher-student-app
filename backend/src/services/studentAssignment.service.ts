import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
    assignments,
    classEnrollments,
    classes,
    submissions,
} from "../db/schema.js";

export const MAX_SUBMISSION_CONTENT_LENGTH = 10_000;

export async function getStudentAssignments(studentId: string) {
    return db
        .select({
            id: assignments.id,
            classId: assignments.classId,
            title: assignments.title,
            description: assignments.description,
            dueAt: assignments.dueAt,
            createdAt: assignments.createdAt,
            grade: classes.grade,
            section: classes.section,
            submission: {
                id: submissions.id,
                status: submissions.status,
                submittedAt: submissions.submittedAt,
                marks: submissions.marks,
            },
        })
        .from(assignments)
        .innerJoin(
            classEnrollments,
            and(
                eq(assignments.classId, classEnrollments.classId),
                eq(classEnrollments.studentId, studentId),
            ),
        )
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .leftJoin(
            submissions,
            and(
                eq(submissions.assignmentId, assignments.id),
                eq(submissions.studentId, studentId),
            ),
        )
        .orderBy(asc(assignments.dueAt));
}

export async function getStudentAssignmentDetails(
    studentId: string,
    assignmentId: string,
) {
    const [assignment] = await db
        .select({
            id: assignments.id,
            classId: assignments.classId,
            title: assignments.title,
            description: assignments.description,
            dueAt: assignments.dueAt,
            createdAt: assignments.createdAt,
            grade: classes.grade,
            section: classes.section,
            submission: {
                id: submissions.id,
                content: submissions.content,
                status: submissions.status,
                submittedAt: submissions.submittedAt,
                marks: submissions.marks,
                feedback: submissions.feedback,
            },
        })
        .from(assignments)
        .innerJoin(
            classEnrollments,
            and(
                eq(assignments.classId, classEnrollments.classId),
                eq(classEnrollments.studentId, studentId),
            ),
        )
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .leftJoin(
            submissions,
            and(
                eq(submissions.assignmentId, assignments.id),
                eq(submissions.studentId, studentId),
            ),
        )
        .where(eq(assignments.id, assignmentId))
        .limit(1);

    return assignment ?? null;
}

export async function submitAssignment(
    studentId: string,
    assignmentId: string,
    content: string,
) {
    return db.transaction(async (tx) => {
        const [assignment] = await tx.select({ id: assignments.id, classId: assignments.classId }).from(assignments)
            .where(eq(assignments.id, assignmentId)).for("update").limit(1);
        if (!assignment) throw new Error("Assignment not found or you are not enrolled in this class");

        const [studentEnrollment] = await tx.select({ id: classEnrollments.id }).from(classEnrollments)
            .where(and(eq(classEnrollments.classId, assignment.classId), eq(classEnrollments.studentId, studentId)))
            .limit(1);
        if (!studentEnrollment) throw new Error("Assignment not found or you are not enrolled in this class");

        const [existing] = await tx.select({ id: submissions.id, status: submissions.status }).from(submissions)
            .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)))
            .for("update").limit(1);
        if (existing?.status === "GRADED") {
            throw new Error("This submission has been graded and can no longer be changed");
        }

        const now = new Date();
        if (existing) {
            const [updatedSubmission] = await tx.update(submissions).set({
                content,
                submittedAt: now,
                status: "SUBMITTED",
                marks: null,
                feedback: null,
                gradedAt: null,
                gradedBy: null,
                updatedAt: now,
            }).where(eq(submissions.id, existing.id)).returning({
                id: submissions.id,
                content: submissions.content,
                status: submissions.status,
                submittedAt: submissions.submittedAt,
            });
            return { submission: updatedSubmission, resubmitted: true };
        }

        const [newSubmission] = await tx.insert(submissions).values({ assignmentId, studentId, content }).returning({
            id: submissions.id,
            content: submissions.content,
            status: submissions.status,
            submittedAt: submissions.submittedAt,
        });
        return { submission: newSubmission, resubmitted: false };
    });
}
