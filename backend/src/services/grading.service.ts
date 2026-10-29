import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { assignments, auditLogs, classEnrollments, classes, notifications, parentStudentLinks, submissions, users } from "../db/schema.js";

export type GradeInput =
    | { status: "GRADED"; marks: number; feedback?: string | undefined }
    | { status: "RETURNED"; feedback: string };

export async function getTeacherAssignments(teacherId: string) {
    return db.select({
        id: assignments.id,
        classId: assignments.classId,
        title: assignments.title,
        description: assignments.description,
        dueAt: assignments.dueAt,
        createdAt: assignments.createdAt,
        grade: classes.grade,
        section: classes.section,
    }).from(assignments)
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .where(eq(assignments.teacherId, teacherId))
        .orderBy(desc(assignments.createdAt));
}

export async function getTeacherAssignmentSubmissions(teacherId: string, assignmentId: string) {
    const [assignment] = await db.select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.id, assignmentId), eq(assignments.teacherId, teacherId)))
        .limit(1);
    if (!assignment) return null;

    const submissionsForAssignment = await db.select({
        id: submissions.id,
        studentId: submissions.studentId,
        studentEmail: users.email,
        content: submissions.content,
        fileUrl: submissions.fileUrl,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
        marks: submissions.marks,
        feedback: submissions.feedback,
        gradedAt: submissions.gradedAt,
    }).from(submissions)
        .innerJoin(users, eq(submissions.studentId, users.id))
        .where(eq(submissions.assignmentId, assignmentId))
        .orderBy(asc(users.email));
    return { assignmentId, submissions: submissionsForAssignment };
}

export async function gradeSubmission(teacherId: string, submissionId: string, input: GradeInput) {
    return db.transaction(async (tx) => {
        const [submissionReference] = await tx.select({ assignmentId: submissions.assignmentId })
            .from(submissions).where(eq(submissions.id, submissionId)).limit(1);
        if (!submissionReference) return null;

        // All grade and resubmission writes lock the assignment first to serialize
        // changes to the same work and avoid a resubmission racing a grade.
        const [assignment] = await tx.select({ id: assignments.id, teacherId: assignments.teacherId, title: assignments.title })
            .from(assignments).where(eq(assignments.id, submissionReference.assignmentId)).for("update").limit(1);
        if (!assignment || assignment.teacherId !== teacherId) {
            throw new Error("You can only review submissions for assignments you created");
        }

        const [submission] = await tx.select({ id: submissions.id, studentId: submissions.studentId, status: submissions.status })
            .from(submissions).where(and(
                eq(submissions.id, submissionId),
                eq(submissions.assignmentId, assignment.id),
            )).for("update").limit(1);
        if (!submission) return null;
        if (submission.status === "GRADED") throw new Error("This submission is already graded and cannot be changed");
        if (submission.status !== "SUBMITTED" && submission.status !== "RETURNED") {
            throw new Error("This submission cannot be reviewed in its current state");
        }

        const now = new Date();
        const [updated] = await tx.update(submissions).set({
            status: input.status,
            marks: input.status === "GRADED" ? input.marks : null,
            feedback: input.feedback?.trim() || null,
            gradedAt: input.status === "GRADED" ? now : null,
            gradedBy: input.status === "GRADED" ? teacherId : null,
            updatedAt: now,
        }).where(eq(submissions.id, submissionId)).returning({
            id: submissions.id,
            studentId: submissions.studentId,
            assignmentId: submissions.assignmentId,
            status: submissions.status,
            marks: submissions.marks,
            feedback: submissions.feedback,
            gradedAt: submissions.gradedAt,
        });
        const eventType = input.status === "GRADED" ? "SUBMISSION_GRADED" as const : "SUBMISSION_RETURNED" as const;
        const eventTitle = input.status === "GRADED" ? "Assignment graded" : "Work returned for revision";
        const recipientIds = new Set<string>([submission.studentId]);
        if (input.status === "GRADED") {
            const parents = await tx.select({ parentId: parentStudentLinks.parentId }).from(parentStudentLinks)
                .innerJoin(users, eq(parentStudentLinks.parentId, users.id))
                .where(and(eq(parentStudentLinks.studentId, submission.studentId), eq(users.role, "PARENT")));
            parents.forEach((link) => recipientIds.add(link.parentId));
        }
        await tx.insert(notifications).values([...recipientIds].map((userId) => ({
            userId,
            eventType,
            title: eventTitle,
            body: `${assignment.title} has been ${input.status === "GRADED" ? "graded" : "returned for revision"}.`,
            href: userId === submission.studentId
                ? `/student/assignments/${assignment.id}`
                : `/parent/marks?childId=${submission.studentId}`,
            entityId: submissionId,
        })));
        await tx.insert(auditLogs).values({
            actorId: teacherId,
            action: input.status === "GRADED" ? "SUBMISSION_GRADED" : "SUBMISSION_RETURNED",
            entityType: "SUBMISSION",
            entityId: submissionId,
            metadata: { previousStatus: submission.status, status: input.status, marks: input.status === "GRADED" ? input.marks : null, feedbackProvided: Boolean(input.feedback?.trim()) },
        });
        return updated ?? null;
    });
}

export async function getStudentGrades(studentId: string) {
    return db.select({
        id: submissions.id,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        dueAt: assignments.dueAt,
        classId: classes.id,
        grade: classes.grade,
        section: classes.section,
        submittedAt: submissions.submittedAt,
        marks: submissions.marks,
        feedback: submissions.feedback,
        gradedAt: submissions.gradedAt,
    }).from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .innerJoin(classEnrollments, and(
            eq(classEnrollments.classId, assignments.classId),
            eq(classEnrollments.studentId, studentId),
        ))
        .where(and(eq(submissions.studentId, studentId), eq(submissions.status, "GRADED")))
        .orderBy(desc(submissions.gradedAt));
}
