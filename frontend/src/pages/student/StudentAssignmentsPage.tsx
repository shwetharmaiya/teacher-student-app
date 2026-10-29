import type { Assignment, AssignmentsResponse } from "../../types/StudentAssignmentsPage.ts";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api/client";




function isOverdue(dueAt: string) {
    return new Date(dueAt).getTime() < Date.now();
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function StudentAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await apiFetch<AssignmentsResponse>("/student/assignments");
            setAssignments(response.assignments ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load assignments.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAssignments();
    }, [loadAssignments]);

    return (
        <div className="student-assignments-page">
            <header className="student-assignments-header">
                <div>
                    <p className="student-page-eyebrow">My Learning</p>
                    <h1>My Assignments</h1>
                    <p>View work assigned to you by your teachers.</p>
                </div>
                <div className="student-assignment-count">
                    {assignments.length}
                    <span>{assignments.length === 1 ? " Assignment" : " Assignments"}</span>
                </div>
            </header>

            {loading ? (
                <div className="student-assignments-state" role="status">Loading assignments…</div>
            ) : error ? (
                <div className="student-assignments-error" role="alert">
                    <p>{error}</p>
                    <button type="button" className="workspace-primary-button" onClick={() => void loadAssignments()}>
                        Try again
                    </button>
                </div>
            ) : assignments.length === 0 ? (
                <div className="student-empty-assignments">
                    <div className="student-empty-icon" aria-hidden="true">📚</div>
                    <h2>No assignments yet</h2>
                    <p>Your teachers haven’t assigned any work to your classes yet.</p>
                </div>
            ) : (
                <div className="student-assignment-grid">
                    {assignments.map((assignment) => {
                        const overdue = isOverdue(assignment.dueAt);
                        const submission = assignment.submission;
                        const statusLabel = submission?.status === "GRADED"
                            ? `Graded${submission.marks === null ? "" : ` · ${submission.marks} marks`}`
                            : submission?.status === "RETURNED"
                                ? "Returned"
                                : submission
                                    ? "Submitted"
                                    : overdue ? "Overdue" : "Not submitted";
                        const statusClass = submission
                            ? "student-assignment-status submitted"
                            : overdue
                                ? "student-assignment-status overdue"
                                : "student-assignment-status";

                        return (
                            <article key={assignment.id} className="student-assignment-card">
                                <div className="student-assignment-card-top">
                                    <span className="student-assignment-class">{assignment.grade} - {assignment.section}</span>
                                    <span className={statusClass}>{statusLabel}</span>
                                </div>
                                <h2>{assignment.title}</h2>
                                <div className="student-assignment-footer">
                                    <div>
                                        <span>Due</span>
                                        <strong>{formatDate(assignment.dueAt)}</strong>
                                    </div>
                                    <Link className="workspace-primary-button" to={`/student/assignments/${assignment.id}`}>
                                        {submission ? "View work" : "Open"}
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
