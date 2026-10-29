import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { assignments, attendanceRecords, classEnrollments, classes, parentStudentLinks, submissions, users } from "../../db/schema.js";

export async function getParentChildren(parentId: string) {
    const children = await db.select({ id: users.id, email: users.email })
        .from(parentStudentLinks)
        .innerJoin(users, eq(parentStudentLinks.studentId, users.id))
        .where(and(eq(parentStudentLinks.parentId, parentId), eq(users.role, "STUDENT")))
        .orderBy(asc(users.email));
    if (children.length === 0) return [];

    const childIds = children.map((child) => child.id);
    const enrolledClasses = await db.select({
        studentId: classEnrollments.studentId,
        id: classes.id,
        grade: classes.grade,
        section: classes.section,
        room: classes.room,
        teacherName: classes.teacherName,
    }).from(classEnrollments)
        .innerJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(inArray(classEnrollments.studentId, childIds))
        .orderBy(asc(classes.grade), asc(classes.section));
    const classesByStudent = new Map<string, Array<Omit<(typeof enrolledClasses)[number], "studentId">>>();
    for (const classRecord of enrolledClasses) {
        const { studentId, ...classInfo } = classRecord;
        const list = classesByStudent.get(studentId) ?? [];
        list.push(classInfo);
        classesByStudent.set(studentId, list);
    }
    return children.map((child) => ({ id: child.id, email: child.email, classes: classesByStudent.get(child.id) ?? [] }));
}

async function requireLinkedStudent(parentId: string, studentId: string) {
    const [student] = await db.select({ id: users.id, email: users.email })
        .from(parentStudentLinks)
        .innerJoin(users, eq(parentStudentLinks.studentId, users.id))
        .where(and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
            eq(users.role, "STUDENT"),
        )).limit(1);
    return student ?? null;
}

async function getAssignmentsForStudent(parentId: string, studentId: string) {
    const classRows = await db.select({ classId: classEnrollments.classId })
        .from(classEnrollments)
        .innerJoin(parentStudentLinks, and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
        ))
        .where(eq(classEnrollments.studentId, studentId));
    const classIds = classRows.map((row) => row.classId);
    if (classIds.length === 0) return [];
    return db.select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueAt: assignments.dueAt,
        grade: classes.grade,
        section: classes.section,
        submittedAt: submissions.submittedAt,
    }).from(assignments)
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .innerJoin(parentStudentLinks, and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
        ))
        .leftJoin(submissions, and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, studentId)))
        .where(inArray(assignments.classId, classIds))
        .orderBy(asc(assignments.dueAt))
        .limit(100);
}

async function getAttendanceForStudent(parentId: string, studentId: string) {
    const records = await db.select({
        id: attendanceRecords.id,
        classId: attendanceRecords.classId,
        grade: classes.grade,
        section: classes.section,
        attendanceDate: attendanceRecords.attendanceDate,
        status: attendanceRecords.status,
    }).from(attendanceRecords)
        .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
        .innerJoin(parentStudentLinks, and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
        ))
        .where(eq(attendanceRecords.studentId, studentId))
        .orderBy(desc(attendanceRecords.attendanceDate));
    const [totals] = await db.select({
        recorded: count(),
        attended: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('PRESENT', 'LATE'))`,
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'PRESENT')`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'ABSENT')`,
        late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'LATE')`,
    }).from(attendanceRecords)
        .innerJoin(parentStudentLinks, and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
        ))
        .where(eq(attendanceRecords.studentId, studentId));
    const recorded = totals?.recorded ?? 0;
    return {
        records,
        summary: {
            recorded,
            present: Number(totals?.present ?? 0),
            absent: Number(totals?.absent ?? 0),
            late: Number(totals?.late ?? 0),
            percentage: recorded === 0 ? null : Math.round(Number(totals?.attended ?? 0) / recorded * 100),
        },
    };
}

export async function getParentDashboard(parentId: string, requestedStudentId?: string) {
    const children = await getParentChildren(parentId);
    const studentId = requestedStudentId ?? children[0]?.id;
    if (!studentId) return { children, selectedChild: null, attendance: null, assignments: [] };
    const selectedChild = await requireLinkedStudent(parentId, studentId);
    if (!selectedChild) return null;
    const [attendance, childAssignments] = await Promise.all([
        getAttendanceForStudent(parentId, studentId),
        getAssignmentsForStudent(parentId, studentId),
    ]);
    return { children, selectedChild, attendance: attendance.summary, assignments: childAssignments.slice(0, 5) };
}

export async function getParentAttendance(parentId: string, studentId: string) {
    const child = await requireLinkedStudent(parentId, studentId);
    if (!child) return null;
    return { child, ...(await getAttendanceForStudent(parentId, studentId)) };
}

export async function getParentAssignments(parentId: string, studentId: string) {
    const child = await requireLinkedStudent(parentId, studentId);
    if (!child) return null;
    return { child, assignments: await getAssignmentsForStudent(parentId, studentId) };
}

export async function getParentGrades(parentId: string, studentId: string) {
    const child = await requireLinkedStudent(parentId, studentId);
    if (!child) return null;
    const grades = await db.select({
        id: submissions.id,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
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
        .innerJoin(parentStudentLinks, and(
            eq(parentStudentLinks.parentId, parentId),
            eq(parentStudentLinks.studentId, studentId),
        ))
        .where(and(eq(submissions.studentId, studentId), eq(submissions.status, "GRADED")))
        .orderBy(desc(submissions.gradedAt));
    return { child, grades };
}
