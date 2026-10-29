export type Submission = {
    id: string;
    status: "SUBMITTED" | "GRADED" | "RETURNED";
    submittedAt: string;
    marks: number | null;
};
export type Assignment = {
    id: string;
    title: string;
    dueAt: string;
    grade: string;
    section: string;
    submission: Submission | null;
};
export type AssignmentsResponse = { assignments: Assignment[] };
