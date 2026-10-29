import { count, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { attendanceRecords, classes, users } from "../../db/schema.js";

export async function getAdminDashboardSummary() {
    const userCounts = await db
        .select({ role: users.role, total: count() })
        .from(users)
        .groupBy(users.role);
    const [classCount] = await db.select({ total: count() }).from(classes);
    const today = new Date().toISOString().slice(0, 10);
    const [attendance] = await db
        .select({
            recorded: count(),
            present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'PRESENT')`,
            late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'LATE')`,
            absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'ABSENT')`,
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.attendanceDate, today));

    const counts = new Map(userCounts.map(({ role, total }) => [role, total]));
    const recorded = attendance?.recorded ?? 0;
    const present = Number(attendance?.present ?? 0);
    const late = Number(attendance?.late ?? 0);
    const absent = Number(attendance?.absent ?? 0);

    return {
        totals: {
            students: counts.get("STUDENT") ?? 0,
            teachers: counts.get("TEACHER") ?? 0,
            classes: classCount?.total ?? 0,
            parents: counts.get("PARENT") ?? 0,
        },
        attendance: {
            date: today,
            recorded,
            present,
            late,
            absent,
            percentage: recorded === 0 ? null : Math.round(((present + late) / recorded) * 1000) / 10,
        },
    };
}
