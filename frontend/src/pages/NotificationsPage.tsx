import type { Notification } from "../types/NotificationsPage.ts";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api/client";
import { useAuth } from "../auth/AuthContext";


export default function NotificationsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await apiFetch<{ notifications: Notification[]; unreadCount: number }>("/notifications?limit=100&page=1");
            setItems(result.notifications);
            setUnreadCount(result.unreadCount);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load notifications.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function markRead(id: string) {
        try {
            const result = await apiFetch<{ notification: { id: string; readAt: string } }>(`/notifications/${id}/read`, { method: "PUT" });
            setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: result.notification.readAt } : item));
            setUnreadCount((current) => Math.max(0, current - 1));
        } catch (readError) {
            setError(readError instanceof Error ? readError.message : "Could not update notification.");
        }
    }

    async function markAllRead() {
        try {
            await apiFetch("/notifications/read-all", { method: "PUT" });
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
            setUnreadCount(0);
        } catch (readError) {
            setError(readError instanceof Error ? readError.message : "Could not update notifications.");
        }
    }

    return <section className="student-records-page">
        <div className="page-heading"><div><p className="eyebrow">Updates</p><h2>Notifications</h2><p className="page-intro">{unreadCount} unread</p></div><button type="button" className="button button-secondary" disabled={!unreadCount} onClick={() => void markAllRead()}>Mark all read</button></div>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => void load()}>Try again</button></div>}
        {loading ? <div className="student-assignments-state" role="status">Loading notifications…</div> : items.length === 0 ? <div className="student-empty-assignments"><h2>You’re all caught up</h2><p>Announcements and assessment updates for your account will appear here.</p></div> : <div className="notification-list">{items.map((item) => {
            const rolePath = user?.role.toLowerCase();
            const href = item.eventType === "ANNOUNCEMENT_PUBLISHED" && rolePath
                ? `/${rolePath}/announcements?announcementId=${item.entityId}`
                : item.href;
            return <article className={`panel notification-card${item.readAt ? " read" : " unread"}`} key={item.id}><div className="notification-copy"><span className="eyebrow">{item.eventType.replaceAll("_", " ").toLowerCase()}</span><h3>{item.title}</h3><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div><div className="notification-actions"><Link to={href}>{item.eventType === "ANNOUNCEMENT_PUBLISHED" ? "View announcement" : "View update"}</Link>{!item.readAt && <button type="button" onClick={() => void markRead(item.id)}>Mark read</button>}</div></article>;
        })}</div>}
    </section>;
}
