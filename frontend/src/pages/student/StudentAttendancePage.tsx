import type { StudentClass, AttendanceRecord, AttendanceResponse } from "../../types/StudentAttendancePage.ts";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";


export default function StudentAttendancePage() {
    const [classes, setClasses] = useState<StudentClass[]>([]);
    const [classId, setClassId] = useState("");
    const [data, setData] = useState<AttendanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
            const [classResult, attendanceResult] = await Promise.all([
                apiFetch<{ classes: StudentClass[] }>("/student/classes"),
                apiFetch<AttendanceResponse>(`/student/attendance${query}`),
            ]);
            setClasses(classResult.classes);
            setData(attendanceResult);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load attendance history.");
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => { void loadAttendance(); }, [loadAttendance]);

    const summary = data?.summary;
    return <section className="student-records-page">
        <p className="eyebrow">Attendance record</p>
        <h2>My attendance</h2>
        <p className="page-intro">Review attendance recorded for your enrolled classes. Late arrivals count as attended.</p>
        <div className="student-attendance-toolbar"><label htmlFor="attendance-class-filter">Class</label><select id="attendance-class-filter" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">All my classes</option>{classes.map((item) => <option key={item.id} value={item.id}>Grade {item.grade} · {item.section}</option>)}</select></div>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadAttendance()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading attendance…</div> : <>
            <div className="stat-grid student-attendance-stats"><article><span>Attendance rate</span><strong>{summary?.percentage == null ? "—" : `${summary.percentage}%`}</strong></article><article><span>Present</span><strong>{summary?.present ?? 0}</strong></article><article><span>Late</span><strong>{summary?.late ?? 0}</strong></article><article><span>Absent</span><strong>{summary?.absent ?? 0}</strong></article></div>
            {data?.records.length ? <div className="table-scroll student-attendance-table-wrap"><table className="classes-table"><thead><tr><th>Date</th><th>Class</th><th>Status</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id}><td>{new Date(`${record.attendanceDate}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td><td>Grade {record.grade} · {record.section}</td><td><span className={`student-attendance-status ${record.status.toLowerCase()}`}>{record.status === "LATE" ? "Late" : record.status === "PRESENT" ? "Present" : "Absent"}</span></td></tr>)}</tbody></table></div>
                : <div className="student-empty-assignments"><div className="student-empty-icon" aria-hidden="true">📅</div><h2>No attendance recorded</h2><p>When your teacher records attendance, your dated history will appear here.</p></div>}
        </>}
    </section>;
}
