import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { assignments, attendanceRecords, classEnrollments, classes, parentStudentLinks, submissions, teacherSubjectAssignments, users } from "../../db/schema.js";
import type { UserRole } from "../auth/auth.service.js";

export class ReportScopeError extends Error {
    constructor(message: string) { super(message); this.name = "ReportScopeError"; }
}

type Filters = { from?: string | undefined; to?: string | undefined; classId?: string | undefined; studentId?: string | undefined; page: number; limit: number };
type Scope = { classIds?: string[]; studentIds?: string[] };

async function getScope(userId: string, role: UserRole, filters: Filters): Promise<Scope> {
    if (role === "ADMIN") return {};
    if (role === "STUDENT") {
        if (filters.studentId && filters.studentId !== userId) throw new ReportScopeError("Student reports are limited to your own records");
        const rows = await db.select({ classId: classEnrollments.classId }).from(classEnrollments).where(eq(classEnrollments.studentId, userId));
        const classIds = rows.map((row) => row.classId);
        if (filters.classId && !classIds.includes(filters.classId)) throw new ReportScopeError("That class is not linked to your student account");
        return { classIds: filters.classId ? [filters.classId] : classIds, studentIds: [userId] };
    }
    if (role === "PARENT") {
        const childRows = await db.select({ id: users.id }).from(parentStudentLinks)
            .innerJoin(users, eq(parentStudentLinks.studentId, users.id))
            .where(and(eq(parentStudentLinks.parentId, userId), eq(users.role, "STUDENT")));
        const linkedIds = childRows.map((row) => row.id);
        const studentIds = filters.studentId ? linkedIds.filter((id) => id === filters.studentId) : linkedIds;
        if (filters.studentId && studentIds.length === 0) throw new ReportScopeError("That student is not linked to your parent account");
        if (studentIds.length === 0) return { classIds: [], studentIds: [] };
        const classRows = await db.select({ classId: classEnrollments.classId }).from(classEnrollments)
            .where(inArray(classEnrollments.studentId, studentIds));
        const allClassIds = [...new Set(classRows.map((row) => row.classId))];
        if (filters.classId && !allClassIds.includes(filters.classId)) throw new ReportScopeError("That class is not linked to your selected student");
        return { classIds: filters.classId ? [filters.classId] : allClassIds, studentIds };
    }

    const direct = await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, userId));
    const assigned = await db.select({ id: teacherSubjectAssignments.classId }).from(teacherSubjectAssignments)
        .where(eq(teacherSubjectAssignments.teacherId, userId));
    const allClassIds = [...new Set([...direct.map((row) => row.id), ...assigned.map((row) => row.id)])];
    if (filters.classId && !allClassIds.includes(filters.classId)) throw new ReportScopeError("That class is not assigned to you");
    const classIds = filters.classId ? [filters.classId] : allClassIds;
    if (!classIds.length) return { classIds: [], studentIds: [] };
    if (filters.studentId) {
        const [enrollment] = await db.select({ id: classEnrollments.id }).from(classEnrollments)
            .where(and(inArray(classEnrollments.classId, classIds), eq(classEnrollments.studentId, filters.studentId))).limit(1);
        if (!enrollment) throw new ReportScopeError("That student is not enrolled in one of your assigned classes");
        return { classIds, studentIds: [filters.studentId] };
    }
    return { classIds };
}

export async function getAttendanceReport(userId: string, role: UserRole, filters: Filters) {
    const scope = await getScope(userId, role, filters);
    if (scope.classIds?.length === 0 || scope.studentIds?.length === 0) return { records: [], total: 0, page: filters.page, limit: filters.limit, summary: { recorded: 0, present: 0, absent: 0, late: 0, attended: 0, percentage: null } };
    const conditions = [];
    if (scope.classIds) conditions.push(inArray(attendanceRecords.classId, scope.classIds));
    if (scope.studentIds) conditions.push(inArray(attendanceRecords.studentId, scope.studentIds));
    if (filters.classId && role === "ADMIN") conditions.push(eq(attendanceRecords.classId, filters.classId));
    if (filters.studentId && role === "ADMIN") conditions.push(eq(attendanceRecords.studentId, filters.studentId));
    if (filters.from) conditions.push(gte(attendanceRecords.attendanceDate, filters.from));
    if (filters.to) conditions.push(lte(attendanceRecords.attendanceDate, filters.to));
    const where = conditions.length ? and(...conditions) : undefined;
    const [totals] = await db.select({
        recorded: count(),
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'PRESENT')`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'ABSENT')`,
        late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'LATE')`,
        attended: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('PRESENT', 'LATE'))`,
    }).from(attendanceRecords).where(where);
    const records = await db.select({
        id: attendanceRecords.id,
        attendanceDate: attendanceRecords.attendanceDate,
        status: attendanceRecords.status,
        classId: classes.id,
        grade: classes.grade,
        section: classes.section,
        studentId: users.id,
        studentEmail: users.email,
    }).from(attendanceRecords)
        .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
        .innerJoin(users, eq(attendanceRecords.studentId, users.id))
        .where(where)
        .orderBy(desc(attendanceRecords.attendanceDate), asc(classes.grade), asc(users.email))
        .limit(filters.limit).offset((filters.page - 1) * filters.limit);
    const recorded = totals?.recorded ?? 0;
    return {
        records,
        total: recorded,
        page: filters.page,
        limit: filters.limit,
        summary: {
            recorded,
            present: Number(totals?.present ?? 0),
            absent: Number(totals?.absent ?? 0),
            late: Number(totals?.late ?? 0),
            attended: Number(totals?.attended ?? 0),
            percentage: recorded === 0 ? null : Math.round(Number(totals?.attended ?? 0) / recorded * 100),
        },
    };
}

export async function getGradeReport(userId: string, role: UserRole, filters: Filters) {
    const scope = await getScope(userId, role, filters);
    if (scope.classIds?.length === 0 || scope.studentIds?.length === 0) return { records: [], total: 0, page: filters.page, limit: filters.limit, summary: { graded: 0, average: null, highest: null, lowest: null } };
    const conditions = [eq(submissions.status, "GRADED")];
    if (scope.classIds) conditions.push(inArray(assignments.classId, scope.classIds));
    if (scope.studentIds) conditions.push(inArray(submissions.studentId, scope.studentIds));
    if (filters.classId && role === "ADMIN") conditions.push(eq(assignments.classId, filters.classId));
    if (filters.studentId && role === "ADMIN") conditions.push(eq(submissions.studentId, filters.studentId));
    if (filters.from) conditions.push(gte(submissions.gradedAt, new Date(`${filters.from}T00:00:00.000Z`)));
    if (filters.to) conditions.push(lte(submissions.gradedAt, new Date(`${filters.to}T23:59:59.999Z`)));
    const where = and(...conditions);
    const [totals] = await db.select({
        graded: count(),
        average: sql<number>`avg(${submissions.marks})`,
        highest: sql<number>`max(${submissions.marks})`,
        lowest: sql<number>`min(${submissions.marks})`,
    }).from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .where(where);
    const records = await db.select({
        id: submissions.id,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        gradedAt: submissions.gradedAt,
        marks: submissions.marks,
        feedback: submissions.feedback,
        classId: classes.id,
        grade: classes.grade,
        section: classes.section,
        studentId: users.id,
        studentEmail: users.email,
    }).from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .innerJoin(classes, eq(assignments.classId, classes.id))
        .innerJoin(users, eq(submissions.studentId, users.id))
        .where(where)
        .orderBy(desc(submissions.gradedAt), asc(users.email))
        .limit(filters.limit).offset((filters.page - 1) * filters.limit);
    return {
        records,
        total: totals?.graded ?? 0,
        page: filters.page,
        limit: filters.limit,
        summary: {
            graded: totals?.graded ?? 0,
            average: totals?.average == null ? null : Math.round(Number(totals.average) * 10) / 10,
            highest: totals?.highest ?? null,
            lowest: totals?.lowest ?? null,
        },
    };
}
