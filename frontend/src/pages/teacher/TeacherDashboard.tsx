import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api/client";

type TeacherClass = { id: string; grade: string; section: string; room: string; studentCount: number };
type Assignment = { id: string; title: string; dueAt: string; classId: string };
type TeacherDashboardData = { classes: TeacherClass[]; totalStudents: number; assignments: Assignment[] };

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiFetch<TeacherDashboardData>("/teacher/dashboard");
        setDashboard(response);
        setClassId(response.classes[0]?.id ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load your teaching dashboard");
      }
    };
    void loadDashboard();
  }, []);

  const publishAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const response = await apiFetch<{ assignment: Assignment }>("/teacher/assignments", { method: "POST", body: JSON.stringify({ classId, title, dueAt }) });
      setDashboard((current) => current ? { ...current, assignments: [response.assignment, ...current.assignments] } : current);
      setTitle("");
      setDueAt("");
      setIsCreating(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not publish assignment");
    } finally {
      setIsSaving(false);
    }
  };

  const classes = dashboard?.classes ?? [];
  const assignments = dashboard?.assignments ?? [];
  return <section>
    <div className="page-heading"><div><p className="eyebrow">Teaching</p><h2>Teacher dashboard</h2><p className="page-intro">Plan classwork and keep up with the learners assigned to you.</p></div>{classes.length > 0 && <button className="button" type="button" onClick={() => setIsCreating((current) => !current)}>+ Publish assignment</button>}</div>
    {error && <p className="classes-error" role="alert">{error}</p>}
    <div className="stat-grid"><article><span>My classes</span><strong>{classes.length}</strong></article><article><span>Students</span><strong>{dashboard?.totalStudents ?? 0}</strong></article><article><span>Published assignments</span><strong>{assignments.length}</strong></article></div>
    {isCreating && <form className="dashboard-form panel" onSubmit={publishAssignment}><h3>Publish an assignment</h3><div className="form-grid"><label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((classItem) => <option value={classItem.id} key={classItem.id}>{classItem.grade} {classItem.section}</option>)}</select></label><label>Due date<input required type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><label className="form-grid-wide">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Algebra practice set" /></label></div><div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setIsCreating(false)}>Cancel</button><button className="button" disabled={isSaving} type="submit">{isSaving ? "Publishing…" : "Publish"}</button></div></form>}
    <article className="panel dashboard-panel"><div className="panel-title-row"><h3>My classes</h3>{classes.length > 0 && <Link className="text-link" to="/teacher/classes">Manage attendance</Link>}</div>{classes.length ? <ul className="data-list">{classes.map((classItem) => <li key={classItem.id}><b>{classItem.grade} {classItem.section}</b><span>Room {classItem.room} · {classItem.studentCount} students</span></li>)}</ul> : <p>No classes are assigned to your account yet. An administrator needs to assign you to a class first.</p>}</article>
    <article className="panel dashboard-panel"><h3>Recent assignments</h3>{assignments.length ? <ul className="data-list">{assignments.map((assignment) => <li key={assignment.id}><b>{assignment.title}</b><span>Due {new Date(assignment.dueAt).toLocaleDateString()}</span></li>)}</ul> : <p>You have not published any assignments yet.</p>}</article>
  </section>;
}
