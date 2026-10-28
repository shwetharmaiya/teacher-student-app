import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "../../services/api/client";

type Subject = { id: string; name: string; code: string; createdAt: string; updatedAt: string };
type SubjectForm = { name: string; code: string };
const emptyForm: SubjectForm = { name: "", code: "" };

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Subject | null>(null);
    const [form, setForm] = useState<SubjectForm>(emptyForm);

    const loadSubjects = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await apiFetch<{ subjects: Subject[] }>("/subjects");
            setSubjects(response.subjects);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load subjects.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadSubjects(); }, [loadSubjects]);

    const visibleSubjects = useMemo(() => {
        const query = search.trim().toLowerCase();
        return subjects.filter((subject) => !query || `${subject.name} ${subject.code}`.toLowerCase().includes(query));
    }, [subjects, search]);

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setError("");
        setFormOpen(true);
    }

    function openEdit(subject: Subject) {
        setEditing(subject);
        setForm({ name: subject.name, code: subject.code });
        setError("");
        setFormOpen(true);
    }

    async function saveSubject(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const result = await apiFetch<{ subject: Subject }>(editing ? `/subjects/${editing.id}` : "/subjects", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify({ name: form.name, code: form.code.toUpperCase() }),
            });
            setSubjects((current) => editing
                ? current.map((subject) => subject.id === result.subject.id ? result.subject : subject)
                : [...current, result.subject].sort((a, b) => a.name.localeCompare(b.name)));
            setFormOpen(false);
            setEditing(null);
            setForm(emptyForm);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save subject.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteSubject(subject: Subject) {
        if (!window.confirm(`Delete ${subject.name} (${subject.code})? Existing teaching assignments that reference it will also be removed.`)) return;
        setError("");
        try {
            await apiFetch(`/subjects/${subject.id}`, { method: "DELETE" });
            setSubjects((current) => current.filter((item) => item.id !== subject.id));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Could not delete subject.");
        }
    }

    return (
        <section className="classes-page admin-management-page">
            <div className="page-heading"><div><p className="eyebrow">Academic structure</p><h2>Subjects</h2><p className="page-intro">Maintain the subjects available for teacher and class assignments.</p></div><button className="button" type="button" onClick={openCreate}>+ Add subject</button></div>
            {error && <p className="classes-error" role="alert">{error}</p>}
            <article className="classes-card">
                <div className="classes-toolbar"><label className="search-field"><span className="sr-only">Search subjects</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or code" /></label></div>
                <div className="table-scroll"><table className="classes-table"><thead><tr><th>Subject</th><th>Code</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visibleSubjects.map((subject) => <tr key={subject.id}><td><strong>{subject.name}</strong></td><td>{subject.code}</td><td className="row-actions"><button type="button" onClick={() => openEdit(subject)}>Edit</button><button type="button" className="danger-action" onClick={() => void deleteSubject(subject)}>Delete</button></td></tr>)}</tbody></table>{loading && <div className="empty-state"><strong>Loading subjects…</strong></div>}{!loading && visibleSubjects.length === 0 && <div className="empty-state"><strong>No subjects found.</strong><span>Adjust your search or add a subject.</span></div>}</div>
            </article>
            {formOpen && <div className="dialog-backdrop" role="presentation"><form className="class-form" onSubmit={saveSubject} aria-labelledby="subject-form-title"><div className="form-heading"><div><p className="eyebrow">{editing ? "Update subject" : "New subject"}</p><h3 id="subject-form-title">{editing ? "Edit subject" : "Create subject"}</h3></div><button className="close-button" type="button" aria-label="Close" onClick={() => setFormOpen(false)}>×</button></div>{error && <p className="classes-error" role="alert">{error}</p>}<div className="form-grid"><label>Subject name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Mathematics" /></label><label>Subject code<input required maxLength={32} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="e.g. MATH" /></label></div><div className="form-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create subject"}</button></div></form></div>}
        </section>
    );
}

