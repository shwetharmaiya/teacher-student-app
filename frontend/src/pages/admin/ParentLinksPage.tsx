import type { Account, ParentLink, Page } from "../../types/ParentLinksPage.ts";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../../services/api/client";


async function loadRoleAccounts(role: Account["role"]) {
    const firstPage = await apiFetch<Page>(`/admin/users?role=${role}&limit=100&page=1`);
    if (firstPage.totalPages <= 1) return firstPage.users;
    const remainingPages = await Promise.all(Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        apiFetch<Page>(`/admin/users?role=${role}&limit=100&page=${index + 2}`),
    ));
    return [...firstPage.users, ...remainingPages.flatMap((page) => page.users)];
}

export default function ParentLinksPage() {
    const [parents, setParents] = useState<Account[]>([]);
    const [students, setStudents] = useState<Account[]>([]);
    const [links, setLinks] = useState<ParentLink[]>([]);
    const [parentId, setParentId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [parentResult, studentResult, linkResult] = await Promise.all([
                loadRoleAccounts("PARENT"),
                loadRoleAccounts("STUDENT"),
                apiFetch<{ links: ParentLink[] }>("/admin/parent-links"),
            ]);
            setParents(parentResult);
            setStudents(studentResult);
            setLinks(linkResult.links);
            setParentId((current) => parentResult.some((user) => user.id === current) ? current : parentResult[0]?.id || "");
            setStudentId((current) => studentResult.some((user) => user.id === current) ? current : studentResult[0]?.id || "");
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load parent links.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadData(); }, [loadData]);

    async function createLink(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await apiFetch("/admin/parent-links", { method: "POST", body: JSON.stringify({ parentId, studentId }) });
            setNotice("Parent-child relationship verified and linked.");
            await loadData();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not create parent link.");
        } finally {
            setSaving(false);
        }
    }

    async function removeLink(link: ParentLink) {
        if (!window.confirm(`Remove ${link.parentEmail}'s access to ${link.studentEmail}?`)) return;
        setError("");
        setNotice("");
        try {
            await apiFetch(`/admin/parent-links/${link.id}`, { method: "DELETE" });
            setLinks((current) => current.filter((item) => item.id !== link.id));
            setNotice("Parent link removed.");
        } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : "Could not remove parent link.");
        }
    }

    return <section className="classes-page admin-management-page">
        <div className="page-heading"><div><p className="eyebrow">Family access</p><h2>Parent links</h2><p className="page-intro">Verify the relationship before granting a parent access to a student's school information.</p></div></div>
        {error && <p className="classes-error" role="alert">{error}</p>}{notice && <p className="student-submission-success" role="status">{notice}</p>}
        <article className="classes-card parent-link-form-card"><form onSubmit={createLink}>
            <h3>Verify and link accounts</h3><p>Confirm identity and guardianship using the school's approved records or contact process before saving this link.</p>
            <div className="form-grid"><label>Parent account<select required value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Select a parent</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}</select></label><label>Student account<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select a student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}</select></label></div>
            <button className="button" disabled={saving || !parents.length || !students.length}>{saving ? "Saving…" : "Confirm and link"}</button>
            {(!parents.length || !students.length) && <p className="admin-form-help">Create parent and student accounts first.</p>}
        </form></article>
        <article className="classes-card"><div className="form-heading"><div><h3>Verified relationships</h3><p>Parents may link to multiple children; students may have multiple linked parents.</p></div></div>
            {loading ? <div className="empty-state"><strong>Loading parent links…</strong></div> : links.length === 0 ? <div className="empty-state"><strong>No parent links yet.</strong><span>Verify a relationship above to grant family access.</span></div> : <div className="table-scroll"><table className="classes-table"><thead><tr><th>Parent</th><th>Student</th><th>Verified</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{links.map((link) => <tr key={link.id}><td>{link.parentEmail}</td><td>{link.studentEmail}</td><td>{new Date(link.verifiedAt).toLocaleDateString()}</td><td className="row-actions"><button type="button" className="danger-action" onClick={() => void removeLink(link)}>Remove access</button></td></tr>)}</tbody></table></div>}
        </article>
    </section>;
}
