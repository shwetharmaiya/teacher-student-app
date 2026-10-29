export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type TeacherClassDetailsResponse = {
    class: { id: string; grade: string; section: string; room: string; students: number };
    students: Array<{ id: string; email: string }>;
    attendance: Array<{ studentId: string; status: AttendanceStatus }>;
};
export type TeacherClassDetails = Omit<TeacherClassDetailsResponse["class"], "students"> & {
    students: Array<{ id: string; email: string; attendanceStatus: AttendanceStatus | null }>;
};
