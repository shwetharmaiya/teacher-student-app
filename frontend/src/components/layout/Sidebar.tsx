import { NavLink } from "react-router-dom";
import type { UserRole } from "../../types/AuthContext";

const navigation: Record<UserRole, { label: string; to: string }[]> = {
  ADMIN: [
    { label: "Dashboard", to: "/admin" },
    { label: "Users", to: "/admin/users" },
    { label: "Classes", to: "/admin/classes" },
    { label: "Subjects", to: "/admin/subjects" },
    { label: "Parent links", to: "/admin/parent-links" },
    { label: "Announcements", to: "/admin/announcements" },
    { label: "Reports", to: "/admin/reports" },
    { label: "Notifications", to: "/admin/notifications" },
  ],
  TEACHER: [
    { label: "Dashboard", to: "/teacher" },
    { label: "My Classes", to: "/teacher/classes" },
    { label: "Students", to: "/teacher/students" },
    { label: "Attendance", to: "/teacher/attendance" },
    { label: "Assignments", to: "/teacher/assignments" },
    { label: "Marks", to: "/teacher/marks" },
    { label: "Announcements", to: "/teacher/announcements" },
    { label: "Reports", to: "/teacher/reports" },
    { label: "Notifications", to: "/teacher/notifications" },
  ],
  STUDENT: [
    { label: "Dashboard", to: "/student/dashboard" },
    { label: "My Classes", to: "/student/classes" },
    { label: "Assignments", to: "/student/assignments" },
    { label: "Marks", to: "/student/marks" },
    { label: "Attendance", to: "/student/attendance" },
    { label: "Announcements", to: "/student/announcements" },
    { label: "Reports", to: "/student/reports" },
    { label: "Notifications", to: "/student/notifications" },
  ],
  PARENT: [
    { label: "Dashboard", to: "/parent/dashboard" },
    { label: "My Children", to: "/parent/children" },
    { label: "Attendance", to: "/parent/attendance" },
    { label: "Assignments", to: "/parent/assignments" },
    { label: "Marks", to: "/parent/marks" },
    { label: "Announcements", to: "/parent/announcements" },
    { label: "Reports", to: "/parent/reports" },
    { label: "Notifications", to: "/parent/notifications" },
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
