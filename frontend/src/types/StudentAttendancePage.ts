export type StudentClass = { id: string; grade: string; section: string; teacherName: string | null; room: string };
export type AttendanceRecord = { id: string; classId: string; grade: string; section: string; attendanceDate: string; status: "PRESENT" | "ABSENT" | "LATE" };
export type AttendanceResponse = {
    records: AttendanceRecord[];
    summary: { recorded: number; present: number; absent: number; late: number; percentage: number | null };
};
