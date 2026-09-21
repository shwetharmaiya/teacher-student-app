import { NavLink } from "react-router-dom";
import type { UserRole } from "../../auth/AuthContext";

const navigation: Record<UserRole, { label: string; to: string }[]> = {
  ADMIN: [
    { label: "Dashboard", to: "/admin" },
    { label: "Users", to: "/admin/users" },
    { label: "Classes", to: "/admin/classes" },
    { label: "Subjects", to: "/admin/subjects" },
  ],
  TEACHER: [
    { label: "Dashboard", to: "/teacher" },
    { label: "My Classes", to: "/teacher/classes" },
    { label: "Students", to: "/teacher/students" },
    { label: "Attendance", to: "/teacher/attendance" },
    { label: "Assignments", to: "/teacher/assignments" },
    { label: "Marks", to: "/teacher/marks" },
  ],
  STUDENT: [
    { label: "Dashboard", to: "/student/dashboard" },
    { label: "My Classes", to: "/student/classes" },
    { label: "Assignments", to: "/student/assignments" },
    { label: "Marks", to: "/student/marks" },
    { label: "Attendance", to: "/student/attendance" },
  ],
  PARENT: [
    { label: "Dashboard", to: "/parent/dashboard" },
    { label: "My Children", to: "/parent/children" },
    { label: "Attendance", to: "/parent/attendance" },
    { label: "Marks", to: "/parent/marks" },
  ],
};

export default function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="sidebar">
      <NavLink className="brand" to={navigation[role][0].to}>
        SchoolHub
      </NavLink>
      <span className="role-label">{role.toLowerCase()} portal</span>
      <nav aria-label="Main navigation">
        {navigation[role].map((item) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            end={item.label === "Dashboard"}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
