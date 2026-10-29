import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../services/api/client";

type Child = { id: string; email: string; classes: Array<{ id: string; grade: string; section: string }> };
type AttendanceData = { child: { id: string; email: string }; records: Array<{ id: string; grade: string; section: string; attendanceDate: string; status: "PRESENT" | "ABSENT" | "LATE" }>; summary: { recorded: number; present: number; absent: number; late: number; percentage: number | null } };
type AssignmentsData = { child: { id: string; email: string }; assignments: Array<{ id: string; title: string; description: string | null; dueAt: string; grade: string; section: string; submittedAt: string | null }> };
type GradesData = { child: { id: string; email: string }; grades: Array<{ id: string; assignmentTitle: string; grade: string; section: string; submittedAt: string; marks: number | null; feedback: string | null; gradedAt: string | null }> };
type ParentRecordsResult =
    | { type: "attendance"; data: AttendanceData }
    | { type: "assignments"; data: AssignmentsData }
    | { type: "grades"; data: GradesData };

export default function ParentRecordsPage({ type }: { type: "attendance" | "assignments" | "grades" }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const childId = searchParams.get("childId") ?? "";
    const [children, setChildren] = useState<Child[]>([]);
    const [data, setData] = useState<ParentRecordsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const requestVersion = useRef(0);

    const load = useCallback(async () => {
        const currentRequest = ++requestVersion.current;
        setLoading(true);
        setError("");
        setData(null);
        try {
            const childResponse = await apiFetch<{ children: Child[] }>("/parent/children");
            if (currentRequest !== requestVersion.current) return;
            setChildren(childResponse.children);
            const selectedId = childId || childResponse.children[0]?.id;
            if (!selectedId) {
                setData(null);
                return;
            }
            if (!childId) setSearchParams({ childId: selectedId }, { replace: true });
            if (type === "attendance") {
                const result = await apiFetch<AttendanceData>(`/parent/attendance?childId=${encodeURIComponent(selectedId)}`);
                if (currentRequest !== requestVersion.current) return;
                setData({ type: "attendance", data: result });
            } else if (type === "assignments") {
                const result = await apiFetch<AssignmentsData>(`/parent/assignments?childId=${encodeURIComponent(selectedId)}`);
                if (currentRequest !== requestVersion.current) return;
                setData({ type: "assignments", data: result });
            } else {
                const result = await apiFetch<GradesData>(`/parent/grades?childId=${encodeURIComponent(selectedId)}`);
                if (currentRequest !== requestVersion.current) return;
                setData({ type: "grades", data: result });
            }
        } catch (loadError) {
            if (currentRequest !== requestVersion.current) return;
            setError(loadError instanceof Error ? loadError.message : `Could not load ${type}.`);
        } finally {
            if (currentRequest === requestVersion.current) setLoading(false);
        }
    }, [childId, setSearchParams, type]);

    useEffect(() => {
        void load();
        return () => { requestVersion.current += 1; };
    }, [load]);
    // A route transition can render once before its loading effect runs. Only
    // consume state tagged for the currently selected page type.
    const currentData = data?.type === type ? data : null;
    const selectedChild = currentData?.data.child;
    const attendanceData = currentData?.type === "attendance" ? currentData.data : null;
    const assignmentsData = currentData?.type === "assignments" ? currentData.data : null;
    const gradesData = currentData?.type === "grades" ? currentData.data : null;

    return <section className="student-records-page">
        <p className="eyebrow">Family updates</p><h2>{type === "attendance" ? "Attendance" : type === "assignments" ? "Assignments" : "Grades"}</h2>
        <p className="page-intro">{type === "attendance" ? "Dated attendance records for a verified linked student." : type === "assignments" ? "Published work and submission status for a verified linked student." : "Final marks and teacher feedback for a verified linked student."}</p>
        {children.length > 0 && <div className="student-attendance-toolbar"><label htmlFor="parent-record-child">Student</label><select id="parent-record-child" value={childId || children[0]?.id || ""} onChange={(event) => setSearchParams({ childId: event.target.value })}>{children.map((child) => <option key={child.id} value={child.id}>{child.email}</option>)}</select></div>}
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void load()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading {type}…</div> : !children.length ? <div className="student-empty-assignments"><h2>No linked students</h2><p>Ask your school administrator to verify and link a student to your account.</p></div> : !selectedChild ? null : type === "attendance" && attendanceData ? <>
            <div className="stat-grid student-attendance-stats"><article><span>Attendance rate</span><strong>{attendanceData.summary.percentage == null ? "—" : `${attendanceData.summary.percentage}%`}</strong></article><article><span>Present</span><strong>{attendanceData.summary.present}</strong></article><article><span>Late</span><strong>{attendanceData.summary.late}</strong></article><article><span>Absent</span><strong>{attendanceData.summary.absent}</strong></article></div>
            {attendanceData.records.length ? <div className="table-scroll student-attendance-table-wrap"><table className="classes-table"><thead><tr><th>Date</th><th>Class</th><th>Status</th></tr></thead><tbody>{attendanceData.records.map((record) => <tr key={record.id}><td>{new Date(`${record.attendanceDate}T00:00:00`).toLocaleDateString()}</td><td>Grade {record.grade} · {record.section}</td><td><span className={`student-attendance-status ${record.status.toLowerCase()}`}>{record.status === "LATE" ? "Late" : record.status === "PRESENT" ? "Present" : "Absent"}</span></td></tr>)}</tbody></table></div> : <div className="student-empty-assignments"><h2>No attendance recorded</h2><p>Records will appear here after the teacher takes attendance.</p></div>}
        </> : assignmentsData ? assignmentsData.assignments.length ? <div className="parent-assignment-list">{assignmentsData.assignments.map((item) => <article className="panel parent-assignment-card" key={item.id}><div><p className="eyebrow">Grade {item.grade} · {item.section}</p><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div><div className="parent-assignment-meta"><span>Due {new Date(item.dueAt).toLocaleDateString()}</span><strong>{item.submittedAt ? "Submitted" : "Not submitted"}</strong></div></article>)}</div> : <div className="student-empty-assignments"><h2>No assignments</h2><p>No assignments have been published for this student.</p></div> : gradesData ? gradesData.grades.length ? <div className="parent-assignment-list">{gradesData.grades.map((item) => <article className="panel parent-assignment-card" key={item.id}><div><p className="eyebrow">Grade {item.grade} · {item.section}</p><h3>{item.assignmentTitle}</h3><p>Submitted {new Date(item.submittedAt).toLocaleDateString()}{item.gradedAt ? ` · Graded ${new Date(item.gradedAt).toLocaleDateString()}` : ""}</p>{item.feedback && <blockquote className="grade-feedback">{item.feedback}</blockquote>}</div><div className="grade-score"><span>Score</span><strong>{item.marks ?? "—"}<small> / 100</small></strong></div></article>)}</div> : <div className="student-empty-assignments"><h2>No grades yet</h2><p>Final grades will appear here after a teacher reviews the work.</p></div> : null}
    </section>;
}
