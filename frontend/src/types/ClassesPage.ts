export type ClassRecord = {
  id: string;
  grade: string;
  section: string;
  teacher: string;
  teacherId: string | null;
  room: string;
  students: number;
  capacity: number;
};
export type ClassApiRecord = {
  id: string;
  grade: string;
  section: string;
  teacherName: string | null;
  teacherId: string | null;
  room: string;
  studentCount: number;
  capacity: number;
};
export type ClassForm = Omit<ClassRecord, "id" | "students">;
export type Person = { id: string; email: string; role: "TEACHER" | "STUDENT" };
