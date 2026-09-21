import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";

type StudentClass = { id: string; grade: string; section: string; teacherName: string | null; room: string };
type StudentAssignment = { id: string; title: string; dueAt: string; grade: string; section: string };
type StudentDashboardData = { classes: StudentClass[]; assignments: StudentAssignment[]; attendance: { recorded: number; percentage: number | null } };

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const loadDashboard = async () => {
      try { setDashboard(await apiFetch<StudentDashboardData>("/student/dashboard")); }
      catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load your learning dashboard"); }
    };
    void loadDashboard();
  }, []);
  const classes = dashboard?.classes ?? [];
  const assignments = dashboard?.assignments ?? [];
  const attendance = dashboard?.attendance;
  return <section>
    <p className="eyebrow">My learning</p><h2>Student dashboard</h2><p className="page-intro">Your classes, attendance, and upcoming work in one place.</p>
    {error && <p className="classes-error" role="alert">{error}</p>}
    <div className="stat-grid"><article><span>Attendance</span><strong>{attendance?.percentage === null || attendance === undefined ? "—" : `${attendance.percentage}%`}</strong></article><article><span>Assignments due</span><strong>{assignments.length}</strong></article><article><span>My classes</span><strong>{classes.length}</strong></article></div>
    <article className="panel dashboard-panel"><h3>My classes</h3>{classes.length ? <ul className="data-list">{classes.map((classItem) => <li key={classItem.id}><b>{classItem.grade} {classItem.section}</b><span>{classItem.teacherName ?? "Teacher not assigned"} · Room {classItem.room}</span></li>)}</ul> : <p>You are not enrolled in a class yet. Ask your school administrator for help.</p>}</article>
    <article className="panel dashboard-panel"><h3>Upcoming assignments</h3>{assignments.length ? <ul className="data-list">{assignments.map((assignment) => <li key={assignment.id}><b>{assignment.title}</b><span>{assignment.grade} {assignment.section} · Due {new Date(assignment.dueAt).toLocaleDateString()}</span></li>)}</ul> : <p>No assignments have been published for your classes.</p>}</article>
  </section>;
}
