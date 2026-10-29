export type Child = { id: string; email: string; classes: Array<{ id: string; grade: string; section: string }> };
export type AttendanceData = { child: { id: string; email: string }; records: Array<{ id: string; grade: string; section: string; attendanceDate: string; status: "PRESENT" | "ABSENT" | "LATE" }>; summary: { recorded: number; present: number; absent: number; late: number; percentage: number | null } };
export type AssignmentsData = { child: { id: string; email: string }; assignments: Array<{ id: string; title: string; description: string | null; dueAt: string; grade: string; section: string; submittedAt: string | null }> };
export type GradesData = { child: { id: string; email: string }; grades: Array<{ id: string; assignmentTitle: string; grade: string; section: string; submittedAt: string; marks: number | null; feedback: string | null; gradedAt: string | null }> };
export type ParentRecordsResult =
    | { type: "attendance"; data: AttendanceData }
    | { type: "assignments"; data: AssignmentsData }
    | { type: "grades"; data: GradesData };
