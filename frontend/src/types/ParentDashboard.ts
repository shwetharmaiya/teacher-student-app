export type ParentChild = { id: string; email: string; classes: Array<{ id: string; grade: string; section: string; room: string; teacherName: string | null }> };
export type ParentDashboardData = {
  children: ParentChild[];
  selectedChild: { id: string; email: string } | null;
  attendance: { recorded: number; present: number; absent: number; late: number; percentage: number | null } | null;
  assignments: Array<{ id: string; title: string; dueAt: string; grade: string; section: string; submittedAt: string | null }>;
};
