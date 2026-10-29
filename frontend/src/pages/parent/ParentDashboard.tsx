import type { ParentDashboardData } from "../../types/ParentDashboard.ts";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../services/api/client";


export default function ParentDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("childId") ?? "";
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = selectedId ? `?childId=${encodeURIComponent(selectedId)}` : "";
      const response = await apiFetch<ParentDashboardData>(`/parent/dashboard${query}`);
      setData(response);
      if (!selectedId && response.selectedChild) setSearchParams({ childId: response.selectedChild.id }, { replace: true });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the family dashboard.");
    } finally {
      setLoading(false);
    }
  }, [selectedId, setSearchParams]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  const attendance = data?.attendance;
  return <section className="student-records-page">
    <p className="eyebrow">Family overview</p><h2>Parent dashboard</h2>
    <p className="page-intro">Attendance and assignment updates for students linked to your account.</p>
    {data?.children.length ? <div className="student-attendance-toolbar"><label htmlFor="parent-dashboard-child">Viewing</label><select id="parent-dashboard-child" value={data.selectedChild?.id ?? ""} onChange={(event) => setSearchParams({ childId: event.target.value })}>{data.children.map((child) => <option key={child.id} value={child.id}>{child.email}</option>)}</select></div> : null}
    {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadDashboard()}>Try again</button></div>}
    {loading ? <div className="student-assignments-state" role="status">Loading family information…</div> : !data?.selectedChild ? <div className="student-empty-assignments"><div className="student-empty-icon" aria-hidden="true">👨‍👩‍👧</div><h2>No linked students</h2><p>Ask your school administrator to verify and link your parent account to a student.</p></div> : <>
      <div className="stat-grid student-attendance-stats"><article><span>Attendance rate</span><strong>{attendance?.percentage == null ? "—" : `${attendance.percentage}%`}</strong></article><article><span>Present</span><strong>{attendance?.present ?? 0}</strong></article><article><span>Late</span><strong>{attendance?.late ?? 0}</strong></article><article><span>Absent</span><strong>{attendance?.absent ?? 0}</strong></article></div>
      <article className="panel dashboard-panel"><h3>Classes</h3>{data.children.find((child) => child.id === data.selectedChild?.id)?.classes.length ? <ul className="data-list">{data.children.find((child) => child.id === data.selectedChild?.id)?.classes.map((classItem) => <li key={classItem.id}><b>Grade {classItem.grade} · {classItem.section}</b><span>Room {classItem.room} · {classItem.teacherName ?? "Teacher not assigned"}</span></li>)}</ul> : <p>No classes are currently enrolled.</p>}</article>
      <article className="panel dashboard-panel"><h3>Assignments</h3>{data.assignments.length ? <ul className="data-list">{data.assignments.map((item) => <li key={item.id}><b>{item.title}</b><span>Grade {item.grade} · {item.section} · Due {new Date(item.dueAt).toLocaleDateString()} · {item.submittedAt ? "Submitted" : "Not submitted"}</span></li>)}</ul> : <p>No assignments have been published for this student.</p>}</article>
    </>}
  </section>;
}
