export type UserRole =
  | "ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}
export interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}
export interface LoginResponse {
  token: string;
  user: User;
}
export interface MeResponse {
  user: User;
}
