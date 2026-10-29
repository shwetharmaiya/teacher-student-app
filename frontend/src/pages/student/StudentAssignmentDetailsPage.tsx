import type { Assignment } from "../../types/StudentAssignmentDetailsPage.ts";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../services/api/client";



const MAX_CONTENT_LENGTH = 10_000;

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function StudentAssignmentDetailsPage() {
    const { assignmentId } = useParams();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadAssignment = useCallback(async () => {
        if (!assignmentId) {
            setError("Invalid assignment link.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const response = await apiFetch<{ assignment: Assignment }>(
                `/student/assignments/${assignmentId}`,
            );
            setAssignment(response.assignment);
            setContent(response.assignment.submission?.content ?? "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this assignment.");
        } finally {
            setLoading(false);
        }
    }, [assignmentId]);

    useEffect(() => {
        void loadAssignment();
    }, [loadAssignment]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!assignmentId || !assignment) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const response = await apiFetch<{ resubmitted: boolean }>(
                `/student/assignments/${assignmentId}/submissions`,
                {
                    method: "POST",
                    body: JSON.stringify({ content }),
                },
            );
            setNotice(response.resubmitted ? "Your submission has been updated." : "Your work has been submitted.");
            await loadAssignment();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not submit your work.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="student-assignments-page"><div className="student-assignments-state" role="status">Loading assignment…</div></div>;
    }

    if (error && !assignment) {
        return (
            <div className="student-assignments-page">
                <div className="student-assignments-error" role="alert">
                    <p>{error}</p>
                    <button type="button" className="workspace-primary-button" onClick={() => void loadAssignment()}>Try again</button>
                </div>
                <Link to="/student/assignments">Back to assignments</Link>
            </div>
        );
    }

    if (!assignment) return null;

    const overdue = new Date(assignment.dueAt).getTime() < Date.now();
    const graded = assignment.submission?.status === "GRADED";

    return (
        <div className="student-assignments-page student-assignment-detail-page">
            <Link className="student-assignment-back" to="/student/assignments">← Back to assignments</Link>
            <article className="student-assignment-detail-card">
                <div className="student-assignment-card-top">
                    <span className="student-assignment-class">{assignment.grade} - {assignment.section}</span>
                    <span className={overdue ? "student-assignment-status overdue" : "student-assignment-status"}>
                        {overdue ? "Past due · late work is accepted" : "Due date"}
                    </span>
                </div>
                <h1>{assignment.title}</h1>
                <p className="student-assignment-due">Due {formatDate(assignment.dueAt)}</p>
                {assignment.description ? <p className="student-assignment-detail-description">{assignment.description}</p> : null}

                {assignment.submission ? (
                    <section className="student-submission-summary" aria-label="Submission status">
                        <h2>Submission status: {assignment.submission.status.toLowerCase()}</h2>
                        <p>Last submitted {formatDate(assignment.submission.submittedAt)}</p>
                        {assignment.submission.marks !== null ? <p>Marks: <strong>{assignment.submission.marks}</strong></p> : null}
                        {assignment.submission.feedback ? <p>Teacher feedback: {assignment.submission.feedback}</p> : null}
                    </section>
                ) : (
                    <p className="student-assignment-unsubmitted">You haven’t submitted work for this assignment.</p>
                )}

                {error ? <div className="student-assignments-error" role="alert">{error}</div> : null}
                {notice ? <div className="student-submission-success" role="status">{notice}</div> : null}

                {graded ? (
                    <p className="student-submission-locked">This submission has been graded and can no longer be changed.</p>
                ) : (
                    <form className="student-submission-form" onSubmit={handleSubmit}>
                        <label htmlFor="submission-content">Your work</label>
                        <textarea
                            id="submission-content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            maxLength={MAX_CONTENT_LENGTH}
                            rows={10}
                            required
                            placeholder="Write your response here…"
                        />
                        <div className="student-submission-form-footer">
                            <span>{content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} characters</span>
                            <button type="submit" className="workspace-primary-button" disabled={saving || !content.trim()}>
                                {saving ? "Submitting…" : assignment.submission ? "Save and resubmit" : "Submit work"}
                            </button>
                        </div>
                        <p className="student-submission-policy">You can edit and resubmit your work until it is graded. Late work is accepted and marked by its submission time.</p>
                    </form>
                )}
            </article>
        </div>
    );
}
