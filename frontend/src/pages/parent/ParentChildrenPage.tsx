import type { Child } from "../../types/ParentChildrenPage.ts";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api/client";


export default function ParentChildrenPage() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    async function loadChildren() {
        setLoading(true);
        setError("");
        try {
            const response = await apiFetch<{ children: Child[] }>("/parent/children");
            setChildren(response.children);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load linked students.");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { void loadChildren(); }, []);

    return <section className="student-records-page">
        <p className="eyebrow">Family accounts</p><h2>My children</h2>
        <p className="page-intro">Only students verified and linked by your school administrator appear here.</p>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadChildren()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading linked students…</div> : children.length === 0 ? <div className="student-empty-assignments"><div className="student-empty-icon" aria-hidden="true">👨‍👩‍👧</div><h2>No linked students</h2><p>Contact your school administrator to verify the relationship and grant access.</p></div> : <div className="student-class-grid">{children.map((child) => <article className="panel student-class-card" key={child.id}><p className="eyebrow">Verified student</p><h3>{child.email}</h3><p>{child.classes.length ? `${child.classes.length} enrolled ${child.classes.length === 1 ? "class" : "classes"}` : "No class enrollment yet"}</p><div className="parent-child-actions"><Link className="button" to={`/parent/dashboard?childId=${child.id}`}>View overview</Link><Link to={`/parent/attendance?childId=${child.id}`}>Attendance</Link><Link to={`/parent/assignments?childId=${child.id}`}>Assignments</Link></div></article>)}</div>}
    </section>;
}
