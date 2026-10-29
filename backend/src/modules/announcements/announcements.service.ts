import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { announcements, auditLogs, classEnrollments, classes, notifications, parentStudentLinks, teacherSubjectAssignments, users } from "../../db/schema.js";
import type { UserRole } from "../auth/auth.service.js";

type AnnouncementInput = { audience: "SCHOOL" | "CLASS"; classId?: string | undefined; title: string; body: string };

async function getClassRecipients(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], classId: string) {
    const enrolled = await tx.select({ id: classEnrollments.studentId }).from(classEnrollments)
        .where(eq(classEnrollments.classId, classId));
    const studentIds = enrolled.map((item) => item.id);
    const recipientIds = new Set(studentIds);
    if (studentIds.length) {
        const parents = await tx.select({ id: parentStudentLinks.parentId }).from(parentStudentLinks)
            .where(inArray(parentStudentLinks.studentId, studentIds));
        parents.forEach((item) => recipientIds.add(item.id));
    }
    const directTeacher = await tx.select({ id: classes.teacherId }).from(classes).where(eq(classes.id, classId)).limit(1);
    if (directTeacher[0]?.id) recipientIds.add(directTeacher[0].id);
    const teachers = await tx.select({ id: teacherSubjectAssignments.teacherId }).from(teacherSubjectAssignments)
        .where(eq(teacherSubjectAssignments.classId, classId));
    teachers.forEach((item) => recipientIds.add(item.id));
    return [...recipientIds];
}

export async function createAnnouncement(authorId: string, authorRole: UserRole, input: AnnouncementInput) {
    if ((input.audience === "CLASS") !== Boolean(input.classId)) {
        throw new Error("Select a class only for a class-targeted announcement");
    }
    return db.transaction(async (tx) => {
        if (input.audience === "CLASS" && input.classId) {
            const [targetClass] = await tx.select({ id: classes.id }).from(classes).where(eq(classes.id, input.classId)).limit(1);
            if (!targetClass) throw new Error("Class not found");
            if (authorRole === "TEACHER") {
                const [direct] = await tx.select({ id: classes.id }).from(classes).where(and(
                    eq(classes.id, input.classId), eq(classes.teacherId, authorId),
                )).limit(1);
                const [subjectAssignment] = await tx.select({ id: teacherSubjectAssignments.id }).from(teacherSubjectAssignments)
                    .where(and(eq(teacherSubjectAssignments.classId, input.classId), eq(teacherSubjectAssignments.teacherId, authorId))).limit(1);
                if (!direct && !subjectAssignment) throw new Error("You can only announce to classes assigned to you");
            }
        }

        const [announcement] = await tx.insert(announcements).values({
            authorId,
            audience: input.audience,
            classId: input.audience === "CLASS" ? input.classId! : null,
            title: input.title,
            body: input.body,
        }).returning();
        if (!announcement) throw new Error("Could not publish announcement");

        const recipients = input.audience === "SCHOOL"
            ? await tx.select({ id: users.id }).from(users)
            : await getClassRecipients(tx, input.classId!);
        const recipientIds = [...new Set(recipients.map((item) => typeof item === "string" ? item : item.id))]
            .filter((id) => id !== authorId);
        if (recipientIds.length) {
            await tx.insert(notifications).values(recipientIds.map((userId) => ({
                userId,
                eventType: "ANNOUNCEMENT_PUBLISHED" as const,
                title: announcement.title,
                body: input.body.slice(0, 500),
                href: `/announcements?announcementId=${announcement.id}`,
                entityId: announcement.id,
            })));
        }
        await tx.insert(auditLogs).values({
            actorId: authorId,
            action: "ANNOUNCEMENT_PUBLISHED",
            entityType: "ANNOUNCEMENT",
            entityId: announcement.id,
            metadata: { audience: announcement.audience, classId: announcement.classId },
        });
        return announcement;
    });
}

async function getVisibleClassIds(userId: string, role: UserRole) {
    if (role === "ADMIN") return undefined;
    if (role === "STUDENT") {
        const rows = await db.select({ classId: classEnrollments.classId }).from(classEnrollments)
            .where(eq(classEnrollments.studentId, userId));
        return rows.map((row) => row.classId);
    }
    if (role === "PARENT") {
        const childRows = await db.select({ studentId: parentStudentLinks.studentId }).from(parentStudentLinks)
            .innerJoin(users, eq(parentStudentLinks.studentId, users.id))
            .where(and(eq(parentStudentLinks.parentId, userId), eq(users.role, "STUDENT")));
        const childIds = childRows.map((row) => row.studentId);
        if (!childIds.length) return [];
        const rows = await db.select({ classId: classEnrollments.classId }).from(classEnrollments)
            .where(inArray(classEnrollments.studentId, childIds));
        return rows.map((row) => row.classId);
    }
    const directRows = await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, userId));
    const assignedRows = await db.select({ classId: teacherSubjectAssignments.classId }).from(teacherSubjectAssignments)
        .where(eq(teacherSubjectAssignments.teacherId, userId));
    return [...new Set([...directRows.map((row) => row.id), ...assignedRows.map((row) => row.classId)])];
}

export async function listAnnouncements(userId: string, role: UserRole) {
    const visibleClassIds = await getVisibleClassIds(userId, role);
    const visibility = role === "ADMIN" ? undefined : visibleClassIds?.length
        ? or(eq(announcements.audience, "SCHOOL"), and(eq(announcements.audience, "CLASS"), inArray(announcements.classId, visibleClassIds)))
        : eq(announcements.audience, "SCHOOL");
    return db.select({
        id: announcements.id,
        authorId: announcements.authorId,
        authorEmail: users.email,
        audience: announcements.audience,
        classId: announcements.classId,
        grade: classes.grade,
        section: classes.section,
        title: announcements.title,
        body: announcements.body,
        publishedAt: announcements.publishedAt,
    }).from(announcements)
        .innerJoin(users, eq(announcements.authorId, users.id))
        .leftJoin(classes, eq(announcements.classId, classes.id))
        .where(and(visibility, sql`${announcements.publishedAt} <= now()`))
        .orderBy(desc(announcements.publishedAt))
        .limit(100);
}
