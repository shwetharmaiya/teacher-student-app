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
