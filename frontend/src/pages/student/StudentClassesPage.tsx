import type { StudentClass } from "../../types/StudentClassesPage.ts";
import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";


export default function StudentClassesPage() {
    const [classes, setClasses] = useState<StudentClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadClasses() {
        setLoading(true);
        setError("");
        try {
            const result = await apiFetch<{ classes: StudentClass[] }>("/student/classes");
            setClasses(result.classes);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load your classes.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void loadClasses(); }, []);

    return <section className="student-records-page">
        <p className="eyebrow">Your timetable</p>
        <h2>My classes</h2>
        <p className="page-intro">Classes you are enrolled in, with your room and teacher information.</p>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadClasses()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading your classes…</div>
            : classes.length === 0 ? <div className="student-empty-assignments"><div className="student-empty-icon" aria-hidden="true">🏫</div><h2>No classes yet</h2><p>Your enrolled classes will appear here. Contact your school administrator if this seems incorrect.</p></div>
                : <div className="student-class-grid">{classes.map((classItem) => <article className="panel student-class-card" key={classItem.id}>
                    <p className="eyebrow">Grade {classItem.grade}</p><h3>Section {classItem.section}</h3>
                    <dl><div><dt>Teacher</dt><dd>{classItem.teacherName ?? "Not assigned"}</dd></div><div><dt>Room</dt><dd>{classItem.room}</dd></div></dl>
                </article>)}</div>}
    </section>;
}
