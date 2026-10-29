import type { AttendanceStatus, TeacherClassDetailsResponse, TeacherClassDetails } from "../types/teacherClassData.ts";



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
