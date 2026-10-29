export type TeachingAssignment = {
    id: string;
    classId: string;
    grade: string;
    section: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
};
export type MyAssignmentsResponse = {
    assignments: TeachingAssignment[];
};
export type Student = {
    id: string;
    email: string;
    role: "STUDENT";
};
export type ClassDetailsResponse = {
    class: {
        id: string;
        grade: string;
        section: string;
        room: string;
        capacity: number;
        students: number;
    };
    students: Student[];
    assignments: Array<{
        id: string;
        title: string;
        description?: string | null;
        dueAt: string;
        createdAt: string;
    }>;
    attendance: Array<{
        studentId: string;
        status: "PRESENT" | "ABSENT" | "LATE";
    }>;
    attendanceDate: string;
};
export type Assignment = NonNullable<ClassDetailsResponse["assignments"]>[number];
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type AttendanceMap = Record<string, AttendanceStatus>;
