import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";
import { useNavigate } from "react-router-dom";

type Assignment = {
    id: string;
    classId: string;
    title: string;
    description?: string | null;
    dueAt: string;
    createdAt: string;
    grade: string;
    section: string;
};

type AssignmentsResponse = {
    assignments: Assignment[];
};

export default function StudentAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");
    const navigate = useNavigate();
    useEffect(() => {
        async function loadAssignments() {
            try {
                setLoading(true);
                setError("");

                const response = await apiFetch<AssignmentsResponse>(
                    "/student/assignments",
                );

                setAssignments(response.assignments ?? []);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not load assignments.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadAssignments();
    }, []);

    function formatDueDate(dateString: string) {
        return new Date(dateString).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function isOverdue(dateString: string) {
        return new Date(dateString).getTime() < Date.now();
    }

    if (loading) {
        return (
            <div className="student-assignments-page">
                <div className="student-assignments-state">
                    Loading assignments...
                </div>
            </div>
        );
    }

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
                    <span>
                        {assignments.length === 1
                            ? " Assignment"
                            : " Assignments"}
                    </span>
                </div>
            </header>

            {error && <div className="student-assignments-error">{error}</div>}

            {assignments.length === 0 ? (
                <div className="student-empty-assignments">
                    <div className="student-empty-icon">📚</div>

                    <h2>No assignments yet</h2>

                    <p>Your teachers haven't assigned any work yet.</p>
                </div>
            ) : (
                <div className="student-assignment-grid">
                    {assignments.map((assignment) => {
                        const overdue = isOverdue(assignment.dueAt);

                        return (
                            <article
                                key={assignment.id}
                                className="student-assignment-card"
                            >
                                <div className="student-assignment-card-top">
                                    <span className="student-assignment-class">
                                        {assignment.grade} -{" "}
                                        {assignment.section}
                                    </span>

                                    <span
                                        className={
                                            overdue
                                                ? "student-assignment-status overdue"
                                                : "student-assignment-status"
                                        }
                                    >
                                        {overdue ? "Overdue" : "Upcoming"}
                                    </span>
                                </div>

                                <h2>{assignment.title}</h2>

                                {assignment.description && (
                                    <p className="student-assignment-description">
                                        {assignment.description}
                                    </p>
                                )}

                                <div className="student-assignment-footer">
                                    <div>
                                        <span>Due</span>

                                        <strong>
                                            {formatDueDate(assignment.dueAt)}
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        className="workspace-primary-button"
                                        onClick={() =>
                                            navigate(
                                                `/student/assignments/${assignment.id}`,
                                            )
                                        }
                                    >
                                        Open
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
