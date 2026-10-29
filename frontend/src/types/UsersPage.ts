export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type UserRecord = { id: string; email: string; role: UserRole; createdAt: string; updatedAt: string };
export type UserPage = { users: UserRecord[]; total: number; page: number; limit: number; totalPages: number };
export type UserForm = { email: string; password: string; role: UserRole };
