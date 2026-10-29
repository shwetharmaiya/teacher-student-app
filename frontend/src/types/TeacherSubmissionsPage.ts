export type Assignment = { id: string; title: string; dueAt: string; grade: string; section: string };
export type Submission = {
    id: string;
    studentId: string;
    studentEmail: string;
    content: string | null;
    fileUrl: string | null;
    submittedAt: string;
    status: "SUBMITTED" | "RETURNED" | "GRADED";
    marks: number | null;
    feedback: string | null;
    gradedAt: string | null;
};
export type ReviewInput = { status: "GRADED"; marks: number; feedback?: string } | { status: "RETURNED"; feedback: string };
