import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/api/client";

type TeacherStudent = {
    studentId: string;
    studentEmail: string;
    classId: string;
    grade: string;
    section: string;
    room: string;
};

export default function TeacherStudentsPage() {
    const [students, setStudents] = useState<TeacherStudent[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function loadStudents() {
            try {
                const response = await apiFetch<{ students: TeacherStudent[] }>("/teacher/students");
                if (active) setStudents(response.students ?? []);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your students");
            } finally {
                if (active) setLoading(false);
            }
        }
        void loadStudents();
        return () => { active = false; };
    }, []);

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        if (!query) return students;
        return students.filter((student) =>
            `${student.studentEmail} ${student.grade} ${student.section} ${student.room}`
                .toLocaleLowerCase()
                .includes(query),
        );
    }, [search, students]);

    const classCount = new Set(students.map(({ classId }) => classId)).size;
    const studentCount = new Set(students.map(({ studentId }) => studentId)).size;

    return (
        <section>
            <div className="page-heading">
                <div>
                    <p className="eyebrow">Teaching</p>
                    <h2>My students</h2>
                    <p className="page-intro">Student rosters from your assigned classes.</p>
                </div>
            </div>

            {error && <p className="classes-error" role="alert">{error}</p>}
            {loading ? (
                <article className="panel" role="status">Loading your students…</article>
            ) : (
                <>
                    <div className="class-summary">
                        <article><span>Assigned classes</span><strong>{classCount}</strong></article>
                        <article><span>Unique students</span><strong>{studentCount}</strong></article>
                        <article><span>Class enrollments</span><strong>{students.length}</strong></article>
                    </div>

                    {students.length === 0 ? (
                        <article className="panel">
                            <h3>No students in your assigned classes</h3>
                            <p>Once students are enrolled in a class assigned to you, their roster will appear here.</p>
                        </article>
                    ) : (
                        <article className="classes-card teacher-classes-card">
                            <div className="classes-toolbar">
                                <label className="search-field">
                                    <span className="sr-only">Search students or classes</span>
                                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, class, or room" />
                                </label>
                                <span>{filteredStudents.length} roster {filteredStudents.length === 1 ? "entry" : "entries"}</span>
                            </div>
                            {filteredStudents.length === 0 ? (
                                <div className="empty-state"><strong>No students match this search.</strong></div>
                            ) : (
                                <div className="table-scroll">
                                    <table className="classes-table">
                                        <thead><tr><th>Student</th><th>Class</th><th>Room</th></tr></thead>
                                        <tbody>{filteredStudents.map((student) => (
                                            <tr key={`${student.classId}-${student.studentId}`}>
                                                <td><strong>{student.studentEmail}</strong></td>
                                                <td>{student.grade} <span className="section-badge">{student.section}</span></td>
                                                <td>{student.room}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            )}
                        </article>
                    )}
                </>
            )}
        </section>
    );
}
