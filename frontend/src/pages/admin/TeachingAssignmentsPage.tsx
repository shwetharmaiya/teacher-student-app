import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";

type Person = {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
};

type SchoolClass = {
    id: string;
    grade: string;
    section: string;
    room: string;
    capacity: number;
    studentCount: number;
};

type Subject = {
    id: string;
    name: string;
    code: string;
};

type TeachingAssignment = {
    id: string;
    teacherId: string;
    teacherEmail: string;
    classId: string;
    grade: string;
    section: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    createdAt: string;
};

type PeopleResponse = {
    people: Person[];
};

type ClassesResponse = {
    classes: SchoolClass[];
};

type SubjectsResponse = {
    subjects: Subject[];
};

type AssignmentsResponse = {
    assignments: TeachingAssignment[];
};

export default function TeachingAssignmentsPage() {
    const [teachers, setTeachers] = useState<Person[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<
        TeachingAssignment[]
    >([]);

    const [teacherId, setTeacherId] = useState("");
    const [classId, setClassId] = useState("");
    const [subjectId, setSubjectId] = useState("");

    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(
        null,
    );

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const [
                peopleResponse,
                classesResponse,
                subjectsResponse,
                assignmentsResponse,
            ] = await Promise.all([
                apiFetch<PeopleResponse>("/classes/people"),
                apiFetch<ClassesResponse>("/classes"),
                apiFetch<SubjectsResponse>("/subjects"),
                apiFetch<AssignmentsResponse>(
                    "/subjects/assignments",
                ),
            ]);

            setTeachers(
                peopleResponse.people.filter(
                    (person) => person.role === "TEACHER",
                ),
            );

            setClasses(classesResponse.classes);
            setSubjects(subjectsResponse.subjects);
            setAssignments(assignmentsResponse.assignments);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load teaching assignment data.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    async function handleAssign() {
        setError("");
        setSuccess("");

        if (!teacherId || !classId || !subjectId) {
            setError(
                "Please select a teacher, class, and subject.",
            );
            return;
        }

        try {
            setAssigning(true);

            await apiFetch("/subjects/assignments", {
                method: "POST",
                body: JSON.stringify({
                    teacherId,
                    classId,
                    subjectId,
                }),
            });

            setSuccess(
                "Teacher has been assigned to the class and subject.",
            );

            setTeacherId("");
            setClassId("");
            setSubjectId("");

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not create assignment.",
            );
        } finally {
            setAssigning(false);
        }
    }

    async function handleDelete(id: string) {
        setError("");
        setSuccess("");

        const confirmed = window.confirm(
            "Are you sure you want to remove this teaching assignment?",
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(id);

            await apiFetch(`/subjects/assignments/${id}`, {
                method: "DELETE",
            });

            setSuccess("Teaching assignment removed.");

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not delete assignment.",
            );
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="teaching-assignments-page">
            <div className="teaching-assignments-header">
                <div>
                    <h1>Teaching Assignments</h1>
                    <p>
                        Assign teachers to classes and subjects.
                    </p>
                </div>
            </div>

            {error && (
                <div className="assignment-alert assignment-alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="assignment-alert assignment-alert-success">
                    {success}
                </div>
            )}

            <section className="assignment-card">
                <div className="assignment-card-header">
                    <div>
                        <h2>Assign Teacher</h2>
                        <p>
                            Select a teacher, class and subject.
                        </p>
                    </div>
                </div>

                <div className="assignment-form">
                    <div className="assignment-field">
                        <label htmlFor="teacher">
                            Teacher
                        </label>

                        <select
                            id="teacher"
                            value={teacherId}
                            onChange={(event) =>
                                setTeacherId(event.target.value)
                            }
                            disabled={loading || assigning}
                        >
                            <option value="">
                                Select teacher
                            </option>

                            {teachers.map((teacher) => (
                                <option
                                    key={teacher.id}
                                    value={teacher.id}
                                >
                                    {teacher.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="assignment-field">
                        <label htmlFor="class">
                            Class
                        </label>

                        <select
                            id="class"
                            value={classId}
                            onChange={(event) =>
                                setClassId(event.target.value)
                            }
                            disabled={loading || assigning}
                        >
                            <option value="">
                                Select class
                            </option>

                            {classes.map((schoolClass) => (
                                <option
                                    key={schoolClass.id}
                                    value={schoolClass.id}
                                >
                                    {schoolClass.grade} -{" "}
                                    {schoolClass.section}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="assignment-field">
                        <label htmlFor="subject">
                            Subject
                        </label>

                        <select
                            id="subject"
                            value={subjectId}
                            onChange={(event) =>
                                setSubjectId(event.target.value)
                            }
                            disabled={loading || assigning}
                        >
                            <option value="">
                                Select subject
                            </option>

                            {subjects.map((subject) => (
                                <option
                                    key={subject.id}
                                    value={subject.id}
                                >
                                    {subject.name} (
                                    {subject.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="assignment-primary-button"
                        onClick={handleAssign}
                        disabled={loading || assigning}
                    >
                        {assigning
                            ? "Assigning..."
                            : "+ Assign Subject"}
                    </button>
                </div>
            </section>

            <section className="assignment-card">
                <div className="assignment-card-header">
                    <div>
                        <h2>Current Assignments</h2>
                        <p>
                            Teachers currently assigned to classes
                            and subjects.
                        </p>
                    </div>

                    <span className="assignment-count">
                        {assignments.length}{" "}
                        {assignments.length === 1
                            ? "assignment"
                            : "assignments"}
                    </span>
                </div>

                {loading ? (
                    <div className="assignment-empty">
                        Loading assignments...
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="assignment-empty">
                        No teaching assignments yet.
                    </div>
                ) : (
                    <div className="assignment-table-wrapper">
                        <table className="assignment-table">
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    <th>Class</th>
                                    <th>Subject</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {assignments.map((assignment) => (
                                    <tr key={assignment.id}>
                                        <td>
                                            <div className="teacher-cell">
                                                <span className="teacher-avatar">
                                                    {assignment.teacherEmail
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>

                                                <span>
                                                    {
                                                        assignment.teacherEmail
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="class-badge">
                                                {assignment.grade} -{" "}
                                                {
                                                    assignment.section
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            <div className="subject-cell">
                                                <strong>
                                                    {
                                                        assignment.subjectName
                                                    }
                                                </strong>
                                                <small>
                                                    {
                                                        assignment.subjectCode
                                                    }
                                                </small>
                                            </div>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="assignment-delete-button"
                                                onClick={() =>
                                                    void handleDelete(
                                                        assignment.id,
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    assignment.id
                                                }
                                            >
                                                {deletingId ===
                                                assignment.id
                                                    ? "Removing..."
                                                    : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}