export type Account = { id: string; email: string; role: "PARENT" | "STUDENT" };
export type ParentLink = { id: string; parentId: string; parentEmail: string; studentId: string; studentEmail: string; verifiedAt: string; createdAt: string };
export type Page = { users: Account[]; totalPages: number };
