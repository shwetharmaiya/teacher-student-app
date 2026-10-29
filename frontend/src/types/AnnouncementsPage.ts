export type ClassOption = { id: string; grade: string; section: string };
export type Announcement = { id: string; authorEmail: string; audience: "SCHOOL" | "CLASS"; classId: string | null; grade: string | null; section: string | null; title: string; body: string; publishedAt: string };
