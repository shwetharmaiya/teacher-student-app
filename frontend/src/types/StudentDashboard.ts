export type StudentClass = { id: string; grade: string; section: string; teacherName: string | null; room: string };
export type StudentAssignment = { id: string; title: string; dueAt: string; grade: string; section: string };
export type StudentDashboardData = { classes: StudentClass[]; assignments: StudentAssignment[]; attendance: { recorded: number; percentage: number | null } };
