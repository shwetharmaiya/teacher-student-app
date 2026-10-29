import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api/client";
import type { UserRole } from "../auth/AuthContext";

type ClassOption = { id: string; grade: string; section: string };
type ChildOption = { id: string; email: string; classes: ClassOption[] };
type AttendanceReport = { records: Array<{ id: string; attendanceDate: string; status: string; grade: string; section: string; studentEmail: string }>; total: number; page: number; limit: number; summary: { recorded: number; present: number; absent: number; late: number; attended: number; percentage: number | null } };
type GradeReport = { records: Array<{ id: string; assignmentTitle: string; gradedAt: string | null; marks: number | null; feedback: string | null; grade: string; section: string; studentEmail: string }>; total: number; page: number; limit: number; summary: { graded: number; average: number | null; highest: number | null; lowest: number | null } };

export default function ReportsPage({ role }: { role: UserRole }) {
    const [reportType, setReportType] = useState<"attendance" | "grades">("attendance");
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [children, setChildren] = useState<ChildOption[]>([]);
    const [classId, setClassId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [report, setReport] = useState<AttendanceReport | GradeReport | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadOptions() {
            setLoadingOptions(true);
            try {
                if (role === "ADMIN") {
                    const result = await apiFetch<{ classes: ClassOption[] }>("/classes");
                    setClasses(result.classes);
                } else if (role === "TEACHER") {
                    const [dashboard, result] = await Promise.all([
                        apiFetch<{ classes: ClassOption[] }>("/teacher/dashboard"),
                        apiFetch<{ assignments: Array<{ classId: string; grade: string; section: string }> }>("/subjects/my-assignments"),
                    ]);
                    const assignedClasses = result.assignments.map((item) => ({ id: item.classId, grade: item.grade, section: item.section }));
                    setClasses([...new Map([...dashboard.classes, ...assignedClasses].map((item) => [item.id, item])).values()]);
                } else if (role === "STUDENT") {
                    const result = await apiFetch<{ classes: ClassOption[] }>("/student/classes");
                    setClasses(result.classes);
                } else {
                    const result = await apiFetch<{ children: ChildOption[] }>("/parent/children");
                    setChildren(result.children);
                    setStudentId((current) => result.children.some((child) => child.id === current) ? current : result.children[0]?.id ?? "");
                }
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Could not load report filters.");
            } finally {
                setLoadingOptions(false);
            }
        }
        void loadOptions();
    }, [role]);

    const activeClasses = useMemo(() => role === "PARENT"
        ? children.find((child) => child.id === studentId)?.classes ?? []
        : classes, [children, classes, role, studentId]);

    const loadReport = useCallback(async () => {
        if (role === "PARENT" && !studentId && children.length) return;
        setLoading(true);
        setError("");
        setReport(null);
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            if (classId) params.set("classId", classId);
            if (role === "PARENT" && studentId) params.set("studentId", studentId);
            params.set("page", String(page));
            params.set("limit", "50");
            const endpoint = reportType === "attendance" ? "/reports/attendance" : "/reports/grades";
            const query = params.toString();
            const response = reportType === "attendance"
                ? await apiFetch<AttendanceReport>(`${endpoint}?${query}`)
                : await apiFetch<GradeReport>(`${endpoint}?${query}`);
            setReport(response);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load report.");
        } finally {
            setLoading(false);
        }
    }, [classId, children.length, from, page, reportType, role, studentId, to]);

    useEffect(() => { if (!loadingOptions) void loadReport(); }, [loadReport, loadingOptions]);

    const total = report?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 50));
    return <section className="student-records-page reports-page">
        <p className="eyebrow">School data</p><h2>Reports</h2>
        <p className="page-intro">Summaries are calculated by the server and limited to records your account is allowed to access.</p>
        <div className="report-toolbar">
            <label>Report<select value={reportType} onChange={(event) => { setReportType(event.target.value as "attendance" | "grades"); setPage(1); }}><option value="attendance">Attendance</option><option value="grades">Grades</option></select></label>
            {role === "PARENT" && <label>Student<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setClassId(""); setPage(1); }}><option value="">Select a linked child</option>{children.map((child) => <option key={child.id} value={child.id}>{child.email}</option>)}</select></label>}
            {activeClasses.length > 0 && <label>Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }}><option value="">All available classes</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>Grade {item.grade} · {item.section}</option>)}</select></label>}
            <label>From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
            <label>To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        </div>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadReport()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading report…</div> : reportType === "attendance" && report ? (() => { const attendance = report as AttendanceReport; return <>
            <div className="stat-grid student-attendance-stats"><article><span>Records</span><strong>{attendance.summary.recorded}</strong></article><article><span>Attendance rate</span><strong>{attendance.summary.percentage == null ? "—" : `${attendance.summary.percentage}%`}</strong></article><article><span>Present</span><strong>{attendance.summary.present}</strong></article><article><span>Late / absent</span><strong>{attendance.summary.late} / {attendance.summary.absent}</strong></article></div>
            {attendance.records.length ? <div className="table-scroll student-attendance-table-wrap"><table className="classes-table"><thead><tr><th>Date</th><th>Class</th>{role !== "STUDENT" && <th>Student</th>}<th>Status</th></tr></thead><tbody>{attendance.records.map((item) => <tr key={item.id}><td>{new Date(`${item.attendanceDate}T00:00:00`).toLocaleDateString()}</td><td>Grade {item.grade} · {item.section}</td>{role !== "STUDENT" && <td>{item.studentEmail}</td>}<td>{item.status}</td></tr>)}</tbody></table></div> : <div className="student-empty-assignments"><h2>No attendance records</h2><p>There are no records matching these filters.</p></div>}
        </>; })() : reportType === "grades" && report ? (() => { const grades = report as GradeReport; return <>
            <div className="stat-grid student-attendance-stats"><article><span>Graded submissions</span><strong>{grades.summary.graded}</strong></article><article><span>Average</span><strong>{grades.summary.average == null ? "—" : `${grades.summary.average}/100`}</strong></article><article><span>Highest</span><strong>{grades.summary.highest == null ? "—" : grades.summary.highest}</strong></article><article><span>Lowest</span><strong>{grades.summary.lowest == null ? "—" : grades.summary.lowest}</strong></article></div>
            {grades.records.length ? <div className="table-scroll student-attendance-table-wrap"><table className="classes-table"><thead><tr><th>Graded</th><th>Assignment</th><th>Class</th>{role !== "STUDENT" && <th>Student</th>}<th>Mark</th><th>Feedback</th></tr></thead><tbody>{grades.records.map((item) => <tr key={item.id}><td>{item.gradedAt ? new Date(item.gradedAt).toLocaleDateString() : "—"}</td><td>{item.assignmentTitle}</td><td>Grade {item.grade} · {item.section}</td>{role !== "STUDENT" && <td>{item.studentEmail}</td>}<td>{item.marks ?? "—"}/100</td><td>{item.feedback ?? "—"}</td></tr>)}</tbody></table></div> : <div className="student-empty-assignments"><h2>No grades found</h2><p>There are no final grades matching these filters.</p></div>}
        </>; })() : null}
        {!loading && report && total > 0 && <div className="admin-pagination"><span>{total} matching records</span><div><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" className="button button-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
    </section>;
}
