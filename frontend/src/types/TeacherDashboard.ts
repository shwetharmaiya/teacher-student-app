export type TeacherClass = {
    id: string;
    grade: string;
    section: string;
    room: string;
    studentCount: number;
};
export type Assignment = { id: string; title: string; dueAt: string; classId: string };
export type TeacherDashboardData = {
    classes: TeacherClass[];
    totalStudents: number;
    assignments: Assignment[];
};
