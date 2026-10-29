export type Person = {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
};
export type SchoolClass = {
    id: string;
    grade: string;
    section: string;
    room: string;
    capacity: number;
    studentCount: number;
};
export type Subject = {
    id: string;
    name: string;
    code: string;
};
export type TeachingAssignment = {
    id: string;
    teacherId: string;
    teacherEmail: string;
    classId: string;
    grade: string;
    section: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    createdAt: string;
};
export type PeopleResponse = {
    people: Person[];
};
export type ClassesResponse = {
    classes: SchoolClass[];
};
export type SubjectsResponse = {
    subjects: Subject[];
};
export type AssignmentsResponse = {
    assignments: TeachingAssignment[];
};
