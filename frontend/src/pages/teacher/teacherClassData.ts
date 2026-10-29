export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export type TeacherClassDetailsResponse = {
    class: { id: string; grade: string; section: string; room: string; students: number };
    students: Array<{ id: string; email: string }>;
    attendance: Array<{ studentId: string; status: AttendanceStatus }>;
};

export type TeacherClassDetails = Omit<TeacherClassDetailsResponse["class"], "students"> & {
    students: Array<{ id: string; email: string; attendanceStatus: AttendanceStatus | null }>;
};

export function mapTeacherClassDetails(response: TeacherClassDetailsResponse): TeacherClassDetails {
    const attendanceByStudent = new Map(response.attendance.map(({ studentId, status }) => [studentId, status]));
    return {
        id: response.class.id,
        grade: response.class.grade,
        section: response.class.section,
        room: response.class.room,
        students: response.students.map((student) => ({
            ...student,
            attendanceStatus: attendanceByStudent.get(student.id) ?? null,
        })),
    };
}
