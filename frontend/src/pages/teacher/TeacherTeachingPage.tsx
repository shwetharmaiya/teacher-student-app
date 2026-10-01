import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api/client";

type TeachingAssignment = {
    id: string;
    classId: string;
    grade: string;
    section: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
};

type MyAssignmentsResponse = {
    assignments: TeachingAssignment[];
};

export default function TeacherTeachingPage() {
    const navigate = useNavigate();

    const [assignments, setAssignments] = useState<
        TeachingAssignment[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadAssignments() {
        try {
            setLoading(true);
            setError("");

            const response =
                await apiFetch<MyAssignmentsResponse>(
                    "/subjects/my-assignments",
                );

            setAssignments(response.assignments);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load your teaching assignments.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAssignments();
    }, []);

    function openClass(assignment: TeachingAssignment) {
        navigate(
            `/teacher/classes/${assignment.classId}?subjectId=${assignment.subjectId}`,
        );
    }

    return (
        <div className="teacher-teaching-page">
            <div className="teacher-teaching-header">
                <div>
                    <h1>My Teaching</h1>
                    <p>
                        Classes and subjects assigned to you by the
                        administrator.
                    </p>
                </div>

                {!loading && (
                    <div className="teacher-teaching-summary">
                        <strong>{assignments.length}</strong>
                        <span>Assignments</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="teacher-teaching-alert">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="teacher-teaching-state">
                    <div className="teacher-loading-spinner" />
                    <p>Loading your teaching assignments...</p>
                </div>
            ) : assignments.length === 0 ? (
                <div className="teacher-teaching-state">
                    <div className="teacher-empty-icon">
                        📚
                    </div>

                    <h2>No teaching assignments</h2>

                    <p>
                        You have not been assigned any classes or
                        subjects yet.
                    </p>
                </div>
            ) : (
                <div className="teacher-teaching-grid">
                    {assignments.map((assignment) => (
                        <article
                            key={assignment.id}
                            className="teacher-teaching-card"
                        >
                            <div className="teacher-card-top">
                                <div className="teacher-class-icon">
                                    {assignment.grade
                                        .replace(
                                            "Grade ",
                                            "",
                                        )
                                        .trim()}
                                </div>

                                <span className="teacher-subject-code">
                                    {assignment.subjectCode}
                                </span>
                            </div>

                            <div className="teacher-card-content">
                                <h2>
                                    {assignment.grade} -{" "}
                                    {assignment.section}
                                </h2>

                                <p className="teacher-subject-name">
                                    {assignment.subjectName}
                                </p>

                                <p className="teacher-card-description">
                                    You are assigned to teach{" "}
                                    <strong>
                                        {
                                            assignment.subjectName
                                        }
                                    </strong>{" "}
                                    for this class.
                                </p>
                            </div>

                            <div className="teacher-card-footer">
                                <button
                                    type="button"
                                    className="teacher-open-class-button"
                                    onClick={() =>
                                        openClass(assignment)
                                    }
                                >
                                    Open Class
                                    <span>→</span>
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}