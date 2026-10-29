import type { DashboardSummary } from "../../types/AdminDashboard.ts";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api/client";


export default function AdminDashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function loadSummary() {
            try {
                const result = await apiFetch<DashboardSummary>("/admin/dashboard");
                if (active) setSummary(result);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : "Could not load dashboard summary");
            } finally {
                if (active) setLoading(false);
            }
        }
        void loadSummary();
        return () => { active = false; };
    }, []);

    const totals = summary?.totals;
    const metrics = [
        ["Students", totals?.students],
        ["Teachers", totals?.teachers],
        ["Classes", totals?.classes],
        ["Parents", totals?.parents],
    ] as const;

    return (
        <section>
            <p className="eyebrow">Administration</p>
            <h2>Admin dashboard</h2>
            <p className="page-intro">Monitor the people and academic structure that make up your school.</p>

            {error && <p className="classes-error" role="alert">{error}</p>}
            <div className="stat-grid" aria-busy={loading}>
                {metrics.map(([label, value]) => (
                    <article key={label}>
                        <span>{label}</span>
                        <strong>{loading || value === undefined ? "—" : value.toLocaleString()}</strong>
                    </article>
                ))}
            </div>

            <article className="panel dashboard-panel" aria-busy={loading}>
                <h3>Today's attendance</h3>
                {loading ? (
                    <p role="status">Loading today's attendance…</p>
                ) : !summary ? (
                    <p>Attendance summary is unavailable.</p>
                ) : summary.attendance.percentage === null ? (
                    <p>No attendance has been recorded today.</p>
                ) : (
                    <>
                        <strong className="metric">{summary.attendance.percentage}%</strong>
                        <p>
                            {summary.attendance.recorded} recorded: {summary.attendance.present} present, {summary.attendance.late} late, {summary.attendance.absent} absent.
                        </p>
                    </>
                )}
            </article>

            <Link to="/admin/teaching-assignments" className="admin-dashboard-card">
                <h3>Teaching Assignments</h3>
                <p>Assign teachers to classes and subjects.</p>
            </Link>
        </section>
    );
}
