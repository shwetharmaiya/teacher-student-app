import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
    assignments,
    attendanceRecords,
    classEnrollments,
    classes,
    users,
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

export async function isTeacherClass(teacherId: string, classId: string) {
    const [classRecord] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.id, classId));

    if (!classRecord) {
        return false;
    }

    const [ownedClass] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(sql`${classes.id} = ${classId} and ${classes.teacherId} = ${teacherId}`)
        .limit(1);
    return Boolean(ownedClass);
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
        .where(
            and(
                eq(classes.id, classId),
                eq(classes.teacherId, teacherId),
            ),
        )
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
    classId: string;
    attendanceDate: string;
    entries: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[];
}) {
    if (input.entries.length === 0) {
        return [];
    }

    const enrolledStudents = await db
        .select({ studentId: classEnrollments.studentId })
        .from(classEnrollments)
        .where(eq(classEnrollments.classId, input.classId));
    const enrolledStudentIds = new Set(enrolledStudents.map((enrollment) => enrollment.studentId));
    if (input.entries.some((entry) => !enrolledStudentIds.has(entry.studentId))) {
        throw new Error("Attendance can only be recorded for students enrolled in this class");
    }

    const records = input.entries.map((entry) => ({
        classId: input.classId,
        studentId: entry.studentId,
        attendanceDate: input.attendanceDate,
        status: entry.status,
    }));

    return db.insert(attendanceRecords).values(records).onConflictDoUpdate({
        target: [
            attendanceRecords.classId,
            attendanceRecords.studentId,
            attendanceRecords.attendanceDate,
        ],
        set: { status: sql`excluded.status` },
    }).returning();
}

export async function getStudentAssignments(
    studentId: string,
) {
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
        })
        .from(assignments)
        .innerJoin(
            classEnrollments,
            eq(
                assignments.classId,
                classEnrollments.classId,
            ),
        )
        .innerJoin(
            classes,
            eq(
                assignments.classId,
                classes.id,
            ),
        )
        .where(
            eq(
                classEnrollments.studentId,
                studentId,
            ),
        )
        .orderBy(
            asc(assignments.dueAt),
        );
}