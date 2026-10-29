import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
    assignments,
    auditLogs,
    attendanceRecords,
    classEnrollments,
    classes,
    users,
    teacherSubjectAssignments,
} from "../../db/schema.js";

export async function getTeacherDashboard(teacherId: string) {
    const teacherClasses = await db
        .select()
        .from(classes)
        .where(eq(classes.teacherId, teacherId))
        .orderBy(asc(classes.grade), asc(classes.section));
    const classIds = teacherClasses.map((classRecord) => classRecord.id);

    if (classIds.length === 0) {
        return { classes: [], totalStudents: 0, assignments: [] };
    }

    const enrollmentCounts = await db
        .select({ classId: classEnrollments.classId, studentCount: count(classEnrollments.id) })
        .from(classEnrollments)
        .where(inArray(classEnrollments.classId, classIds))
        .groupBy(classEnrollments.classId);
    const studentsByClass = new Map(enrollmentCounts.map((item) => [item.classId, item.studentCount]));

    const recentAssignments = await db
        .select()
        .from(assignments)
        .where(eq(assignments.teacherId, teacherId))
        .orderBy(desc(assignments.dueAt))
        .limit(5);

    return {
        classes: teacherClasses.map((classRecord) => ({
            ...classRecord,
            studentCount: studentsByClass.get(classRecord.id) ?? 0,
        })),
        totalStudents: enrollmentCounts.reduce((total, item) => total + item.studentCount, 0),
        assignments: recentAssignments,
    };
}

export async function getStudentDashboard(studentId: string) {
    const enrolledClasses = await db
        .select({
            id: classes.id,
            grade: classes.grade,
            section: classes.section,
            teacherName: classes.teacherName,
            room: classes.room,
        })
        .from(classEnrollments)
        .innerJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(eq(classEnrollments.studentId, studentId))
        .orderBy(asc(classes.grade), asc(classes.section));
    const classIds = enrolledClasses.map((classRecord) => classRecord.id);

    const upcomingAssignments = classIds.length === 0
        ? []
        : await db
            .select({
                id: assignments.id,
                title: assignments.title,
                description: assignments.description,
                dueAt: assignments.dueAt,
                grade: classes.grade,
                section: classes.section,
            })
            .from(assignments)
            .innerJoin(classes, eq(assignments.classId, classes.id))
            .where(inArray(assignments.classId, classIds))
            .orderBy(asc(assignments.dueAt))
            .limit(5);

    const [attendance] = await db
        .select({
            total: count(attendanceRecords.id),
            present: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('PRESENT', 'LATE'))`,
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.studentId, studentId));

    const totalAttendance = attendance?.total ?? 0;
    const presentAttendance = Number(attendance?.present ?? 0);

    return {
        classes: enrolledClasses,
        assignments: upcomingAssignments,
        attendance: {
            recorded: totalAttendance,
            percentage: totalAttendance === 0 ? null : Math.round((presentAttendance / totalAttendance) * 100),
        },
    };
}

export async function getStudentClasses(studentId: string) {
    return db
        .select({
            id: classes.id,
            grade: classes.grade,
            section: classes.section,
            teacherName: classes.teacherName,
            room: classes.room,
        })
        .from(classEnrollments)
        .innerJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(eq(classEnrollments.studentId, studentId))
        .orderBy(asc(classes.grade), asc(classes.section));
}

export async function getStudentAttendance(studentId: string, classId?: string) {
    const conditions = [eq(attendanceRecords.studentId, studentId)];
    if (classId) conditions.push(eq(attendanceRecords.classId, classId));
    const records = await db
        .select({
            id: attendanceRecords.id,
            classId: attendanceRecords.classId,
            grade: classes.grade,
            section: classes.section,
            attendanceDate: attendanceRecords.attendanceDate,
            status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.attendanceDate), asc(classes.grade), asc(classes.section));
    const summary = records.reduce((total, record) => {
        total.recorded += 1;
        total[record.status.toLowerCase() as "present" | "absent" | "late"] += 1;
        if (record.status === "PRESENT" || record.status === "LATE") total.attended += 1;
        return total;
    }, { recorded: 0, present: 0, absent: 0, late: 0, attended: 0 });
    return {
        records,
        summary: {
            recorded: summary.recorded,
            present: summary.present,
            absent: summary.absent,
            late: summary.late,
            percentage: summary.recorded === 0 ? null : Math.round(summary.attended / summary.recorded * 100),
        },
    };
}

export async function isTeacherClass(teacherId: string, classId: string) {
    const [subjectAssignment] = await db
        .select({ id: teacherSubjectAssignments.id })
        .from(teacherSubjectAssignments)
        .where(and(
            eq(teacherSubjectAssignments.teacherId, teacherId),
            eq(teacherSubjectAssignments.classId, classId),
        ))
        .limit(1);

    if (subjectAssignment) return true;

    // Keep support for classes assigned directly through the legacy class.teacherId field.
    const [directAssignment] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(and(
            eq(classes.id, classId),
            eq(classes.teacherId, teacherId),
        ))
        .limit(1);

    return Boolean(directAssignment);
}

export async function getTeacherClassDetails(
    teacherId: string,
    classId: string,
    attendanceDate: string,
) {
    const [classData] = await db
        .select({
            id: classes.id,
            grade: classes.grade,
            section: classes.section,
            room: classes.room,
            capacity: classes.capacity,
        })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classData) {
        return null;
    }

    const students = await db
        .select({
            id: users.id,
            email: users.email,
            role: users.role,
        })
        .from(classEnrollments)
        .innerJoin(
            users,
            eq(
                classEnrollments.studentId,
                users.id,
            ),
        )
        .where(
            eq(
                classEnrollments.classId,
                classId,
            ),
        )
        .orderBy(users.email);

    const classAssignments = await db
        .select({
            id: assignments.id,
            title: assignments.title,
            description: assignments.description,
            dueAt: assignments.dueAt,
            createdAt: assignments.createdAt,
        })
        .from(assignments)
        .where(
            and(
                eq(assignments.classId, classId),
                eq(assignments.teacherId, teacherId),
            ),
        )
        .orderBy(desc(assignments.createdAt));

    const attendance = await db
        .select({
            studentId: attendanceRecords.studentId,
            status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(
            and(
                eq(
                    attendanceRecords.classId,
                    classId,
                ),
                eq(
                    attendanceRecords.attendanceDate,
                    attendanceDate,
                ),
            ),
        );

    return {
        class: {
            ...classData,
            students: students.length,
        },
        students,
        assignments: classAssignments,
        attendance,
        attendanceDate,
    };
}

export async function createAssignment(input: {
    classId: string;
    teacherId: string;
    title: string;
    description?: string | undefined;
    dueAt: Date;
}) {
    const [assignment] = await db.insert(assignments).values(input).returning();
    return assignment;
}

export async function recordAttendance(input: {
    teacherId: string;
    classId: string;
    attendanceDate: string;
    entries: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[];
}) {
    if (input.entries.length === 0) {
        return [];
    }

    return db.transaction(async (tx) => {
        const [classRecord] = await tx.select({ id: classes.id, teacherId: classes.teacherId })
            .from(classes).where(eq(classes.id, input.classId)).for("update").limit(1);
        if (!classRecord) throw new Error("Class not found");

        const [subjectAssignment] = await tx.select({ id: teacherSubjectAssignments.id })
            .from(teacherSubjectAssignments)
            .where(and(eq(teacherSubjectAssignments.teacherId, input.teacherId), eq(teacherSubjectAssignments.classId, input.classId)))
            .limit(1);
        if (classRecord.teacherId !== input.teacherId && !subjectAssignment) {
            throw new Error("You can only record attendance for your assigned classes");
        }

        const uniqueStudentIds = new Set(input.entries.map((entry) => entry.studentId));
        if (uniqueStudentIds.size !== input.entries.length) throw new Error("Each student can appear only once in an attendance roster");
        const enrolledStudents = await tx.select({ studentId: classEnrollments.studentId })
            .from(classEnrollments).where(and(
                eq(classEnrollments.classId, input.classId),
                inArray(classEnrollments.studentId, [...uniqueStudentIds]),
            ));
        if (enrolledStudents.length !== uniqueStudentIds.size) {
            throw new Error("Attendance can only be recorded for students enrolled in this class");
        }

        const records = input.entries.map((entry) => ({
            classId: input.classId,
            studentId: entry.studentId,
            attendanceDate: input.attendanceDate,
            status: entry.status,
        }));
        const saved = await tx.insert(attendanceRecords).values(records).onConflictDoUpdate({
            target: [attendanceRecords.classId, attendanceRecords.studentId, attendanceRecords.attendanceDate],
            set: { status: sql`excluded.status` },
        }).returning();
        await tx.insert(auditLogs).values({
            actorId: input.teacherId,
            action: "ATTENDANCE_ROSTER_SAVED",
            entityType: "CLASS",
            entityId: input.classId,
            metadata: {
                attendanceDate: input.attendanceDate,
                recordCount: saved.length,
                present: records.filter((record) => record.status === "PRESENT").length,
                absent: records.filter((record) => record.status === "ABSENT").length,
                late: records.filter((record) => record.status === "LATE").length,
            },
        });
        return saved;
    });
}





