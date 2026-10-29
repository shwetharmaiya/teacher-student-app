import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../services/api/client";
import type { UserRole } from "../auth/AuthContext";

type ClassOption = { id: string; grade: string; section: string };
type Announcement = { id: string; authorEmail: string; audience: "SCHOOL" | "CLASS"; classId: string | null; grade: string | null; section: string | null; title: string; body: string; publishedAt: string };

export default function AnnouncementsPage({ role }: { role: UserRole }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [audience, setAudience] = useState<"SCHOOL" | "CLASS">("SCHOOL");
    const [classId, setClassId] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const canPublish = role === "ADMIN" || role === "TEACHER";

    const loadAnnouncements = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await apiFetch<{ announcements: Announcement[] }>("/announcements");
            setAnnouncements(result.announcements);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load announcements.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);
    useEffect(() => {
        if (!canPublish) return;
        const loadClasses = async () => {
            try {
                if (role === "ADMIN") {
                    const response = await apiFetch<{ classes: Array<{ id: string; grade: string; section: string }> }>("/classes");
                    setClasses(response.classes);
                } else {
                    const [dashboard, response] = await Promise.all([
                        apiFetch<{ classes: ClassOption[] }>("/teacher/dashboard"),
                        apiFetch<{ assignments: Array<{ classId: string; grade: string; section: string }> }>("/subjects/my-assignments"),
                    ]);
                    const assignedClasses = response.assignments.map((item) => ({ id: item.classId, grade: item.grade, section: item.section }));
                    setClasses([...new Map([...dashboard.classes, ...assignedClasses].map((item) => [item.id, item])).values()]);
                }
            } catch { setClasses([]); }
        };
        void loadClasses();
    }, [canPublish, role]);

    async function publish(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await apiFetch("/announcements", { method: "POST", body: JSON.stringify({ audience, ...(audience === "CLASS" ? { classId } : {}), title, body }) });
            setTitle("");
            setBody("");
            setNotice("Announcement published.");
            await loadAnnouncements();
        } catch (publishError) {
            setError(publishError instanceof Error ? publishError.message : "Could not publish announcement.");
        } finally {
            setSaving(false);
        }
    }

    return <section className="student-records-page">
        <p className="eyebrow">School communication</p><h2>Announcements</h2>
        <p className="page-intro">School-wide notices and messages for classes you can access.</p>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void loadAnnouncements()}>Try again</button></div>}
        {notice && <p className="student-submission-success" role="status">{notice}</p>}
        {canPublish && <article className="panel announcement-compose"><form onSubmit={publish}>
            <h3>Publish an announcement</h3>
            <label>Audience<select value={audience} onChange={(event) => { setAudience(event.target.value as "SCHOOL" | "CLASS"); setClassId(""); }}><option value="SCHOOL">Whole school</option><option value="CLASS">One class</option></select></label>
            {audience === "CLASS" && <label>Class<select required value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>Grade {item.grade} · {item.section}</option>)}</select>{classes.length === 0 && <span className="admin-form-help">No assigned classes are available for class announcements.</span>}</label>}
            <label>Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Message<textarea required maxLength={5000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} /><span className="admin-form-help">{body.length}/5000</span></label>
            <button className="button" disabled={saving || (audience === "CLASS" && !classId)}>{saving ? "Publishing…" : "Publish now"}</button>
        </form></article>}
        {loading ? <div className="student-assignments-state" role="status">Loading announcements…</div> : announcements.length === 0 ? <div className="student-empty-assignments"><h2>No announcements</h2><p>New announcements for you will appear here.</p></div> : <div className="announcement-list">{announcements.map((item) => <article className="panel announcement-card" key={item.id}><div className="announcement-meta"><span>{item.audience === "SCHOOL" ? "Whole school" : `Grade ${item.grade} · ${item.section}`}</span><time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString()}</time></div><h3>{item.title}</h3><p>{item.body}</p><span className="announcement-author">Posted by {item.authorEmail}</span></article>)}</div>}
    </section>;
}
