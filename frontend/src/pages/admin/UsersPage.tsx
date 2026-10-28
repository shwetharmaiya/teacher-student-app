import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../../services/api/client";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
type UserRecord = { id: string; email: string; role: UserRole; createdAt: string; updatedAt: string };
type UserPage = { users: UserRecord[]; total: number; page: number; limit: number; totalPages: number };
type UserForm = { email: string; password: string; role: UserRole };
const emptyForm: UserForm = { email: "", password: "", role: "STUDENT" };
const roleLabels: Record<UserRole, string> = { ADMIN: "Administrator", TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent" };

export default function UsersPage() {
    const [data, setData] = useState<UserPage>({ users: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState<UserRecord | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<UserForm>(emptyForm);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const query = new URLSearchParams({ search, page: String(page), limit: "10" });
            if (roleFilter) query.set("role", roleFilter);
            setData(await apiFetch<UserPage>(`/admin/users?${query.toString()}`));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load users.");
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, page]);

    useEffect(() => { void loadUsers(); }, [loadUsers]);

    function openCreate() {
        setEditing(null);
        setFormOpen(true);
        setForm(emptyForm);
        setError("");
    }

    function openEdit(user: UserRecord) {
        setEditing(user);
        setFormOpen(true);
        setForm({ email: user.email, password: "", role: user.role });
        setError("");
    }

    async function saveUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = editing
            ? { email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) }
            : form;
        try {
            await apiFetch(editing ? `/admin/users/${editing.id}` : "/admin/users", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(payload),
            });
            setEditing(null);
            setFormOpen(false);
            setForm(emptyForm);
            await loadUsers();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save account.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser(user: UserRecord) {
        if (!window.confirm(`Delete ${user.email}? This also removes their linked records.`)) return;
        setError("");
        try {
            await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
            if (data.users.length === 1 && page > 1) setPage(page - 1);
            else await loadUsers();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Could not delete account.");
        }
    }

    return (
        <section className="classes-page admin-management-page">
            <div className="page-heading">
                <div><p className="eyebrow">Administration</p><h2>User accounts</h2><p className="page-intro">Create and manage school accounts. Passwords are stored as bcrypt hashes.</p></div>
                <button className="button" type="button" onClick={openCreate}>+ Add user</button>
            </div>
            {error && <p className="classes-error" role="alert">{error}</p>}
            <article className="classes-card">
                <div className="classes-toolbar">
                    <label className="search-field"><span className="sr-only">Search by email</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by email" /></label>
                    <label className="filter-field"><span>Role</span><select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as UserRole | ""); setPage(1); }}><option value="">All roles</option>{(Object.keys(roleLabels) as UserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
                </div>
                <div className="table-scroll">
                    <table className="classes-table"><thead><tr><th>Email</th><th>Role</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody>{data.users.map((user) => <tr key={user.id}><td><strong>{user.email}</strong></td><td>{roleLabels[user.role]}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td className="row-actions"><button type="button" onClick={() => openEdit(user)}>Edit</button><button type="button" className="danger-action" onClick={() => void deleteUser(user)}>Delete</button></td></tr>)}</tbody>
                    </table>
                    {loading && <div className="empty-state"><strong>Loading accounts…</strong></div>}
                    {!loading && data.users.length === 0 && <div className="empty-state"><strong>No accounts found.</strong><span>Adjust the filters or create a school account.</span></div>}
                </div>
                <div className="admin-pagination"><span>{data.total} account{data.total === 1 ? "" : "s"}</span><div><button type="button" className="button button-secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {data.totalPages ? data.page : 0} of {data.totalPages}</span><button type="button" className="button button-secondary" disabled={page >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
            </article>

            {formOpen && <div className="dialog-backdrop" role="presentation"><form className="class-form" onSubmit={saveUser} aria-labelledby="user-form-title">
                <div className="form-heading"><div><p className="eyebrow">{editing ? "Update account" : "New account"}</p><h3 id="user-form-title">{editing ? "Edit user" : "Create user"}</h3></div><button className="close-button" type="button" aria-label="Close" onClick={() => { setEditing(null); setFormOpen(false); setForm(emptyForm); }}>×</button></div>
                {error && <p className="classes-error" role="alert">{error}</p>}
                <div className="form-grid"><label>Email<input type="email" autoComplete="off" required maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>{(Object.keys(roleLabels) as UserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><label>{editing ? "New password (optional)" : "Temporary password"}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required={!editing} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label></div>
                <p className="admin-form-help">Share temporary credentials with the account holder through your school’s approved channel.</p>
                <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(null); setFormOpen(false); setForm(emptyForm); }} disabled={saving}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create account"}</button></div>
            </form></div>}
        </section>
    );
}





