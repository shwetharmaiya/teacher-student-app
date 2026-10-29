export type Submission = {
    id: string;
    content: string | null;
    status: "SUBMITTED" | "GRADED" | "RETURNED";
    submittedAt: string;
    marks: number | null;
    feedback: string | null;
};
export type Assignment = {
    id: string;
    title: string;
    description: string | null;
    dueAt: string;
    createdAt: string;
    grade: string;
    section: string;
    submission: Submission | null;
};
