import type { GradeRecord } from "../../types/StudentGradesPage.ts";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";


export default function StudentGradesPage() {
    const [grades, setGrades] = useState<GradeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const loadGrades = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await apiFetch<{ grades: GradeRecord[] }>("/student/grades");
            setGrades(result.grades);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load grades.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void loadGrades(); }, [loadGrades]);

    return <section className="student-records-page">
        <p className="eyebrow">Assessment results</p><h2>My grades</h2>
        <p className="page-intro">Final marks and teacher feedback for work that has been graded.</p>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadGrades()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading grades…</div> : grades.length === 0 ? <div className="student-empty-assignments"><div className="student-empty-icon" aria-hidden="true">📊</div><h2>No grades yet</h2><p>Grades will appear after a teacher reviews and finalizes a submission.</p></div> : <div className="parent-assignment-list">{grades.map((item) => <article className="panel parent-assignment-card" key={item.id}><div><p className="eyebrow">Grade {item.grade} · {item.section}</p><h3>{item.assignmentTitle}</h3><p>Submitted {new Date(item.submittedAt).toLocaleDateString()}{item.gradedAt ? ` · Graded ${new Date(item.gradedAt).toLocaleDateString()}` : ""}</p>{item.feedback && <blockquote className="grade-feedback">{item.feedback}</blockquote>}</div><div className="grade-score"><span>Score</span><strong>{item.marks ?? "—"}<small> / 100</small></strong></div></article>)}</div>}
    </section>;
}
