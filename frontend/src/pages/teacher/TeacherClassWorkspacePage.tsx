import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../services/api/client";
import CreateAssignmentModal from "./CreateAssignmentModal";

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

type Student = {
    id: string;
    email: string;
    role: "STUDENT";
};

type ClassDetailsResponse = {
    class: {
        id: string;
        grade: string;
        section: string;
        room: string;
        students: Student[];
    };
    assignments?: Array<{
        id: string;
        title: string;
        description?: string | null;
        dueAt: string;
        createdAt: string;
    }>;
    attendance?: Array<{
        studentId: string;
        status: "PRESENT" | "ABSENT" | "LATE";
    }>;
    attendanceDate: string;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type AttendanceMap = Record<string, AttendanceStatus>;

export default function TeacherClassWorkspacePage() {
    const [showCreateAssignment, setShowCreateAssignment] = useState(false);
    const navigate = useNavigate();
    const { classId } = useParams<{ classId: string }>();
    const [searchParams] = useSearchParams();

    const subjectId = searchParams.get("subjectId");

    const [assignment, setAssignment] = useState<TeachingAssignment | null>(
        null,
    );

    const [classDetails, setClassDetails] =
        useState<ClassDetailsResponse | null>(null);

    const [attendanceDate, setAttendanceDate] = useState(
        new Date().toISOString().slice(0, 10),
    );

    const [attendance, setAttendance] = useState<AttendanceMap>({});

    const [activeTab, setActiveTab] = useState<
        "overview" | "attendance" | "assignments" | "notes" | "marks"
    >("overview");

    const [loading, setLoading] = useState(true);
    const [savingAttendance, setSavingAttendance] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    function handleAssignmentCreated(newAssignment: Assignment) {
        setClassDetails((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                assignments: [newAssignment, ...(current.assignments ?? [])],
            };
        });

        setShowCreateAssignment(false);

        setSuccess("Assignment published successfully.");
    }
    useEffect(() => {
        async function loadWorkspace() {
            if (!classId || !subjectId) {
                setError("Class or subject information is missing.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const assignmentsResponse =
                    await apiFetch<MyAssignmentsResponse>(
                        "/subjects/my-assignments",
                    );

                const selectedAssignment = assignmentsResponse.assignments.find(
                    (item) =>
                        item.classId === classId &&
                        item.subjectId === subjectId,
                );

                if (!selectedAssignment) {
                    setError("You are not assigned to this class and subject.");
                    setLoading(false);
                    return;
                }

                setAssignment(selectedAssignment);

                const detailsResponse = await apiFetch<ClassDetailsResponse>(
                    `/teacher/classes/${classId}?attendanceDate=${attendanceDate}`,
                );

                setClassDetails(detailsResponse);

                const initialAttendance: AttendanceMap = {};

                (detailsResponse.class.students ?? []).forEach((student) => {
                    initialAttendance[student.id] = "PRESENT";
                });

                (detailsResponse.attendance ?? []).forEach((record) => {
                    initialAttendance[record.studentId] = record.status;
                });

                setAttendance(initialAttendance);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not load class workspace.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadWorkspace();
    }, [classId, subjectId, attendanceDate]);

    function updateAttendance(studentId: string, status: AttendanceStatus) {
        setAttendance((current) => ({
            ...current,
            [studentId]: status,
        }));
    }

    async function saveAttendance() {
        if (!classId || !classDetails) {
            return;
        }

        try {
            setSavingAttendance(true);
            setError("");
            setSuccess("");

            const records = classDetails.class.students.map((student) => ({
                studentId: student.id,
                status: attendance[student.id] || "PRESENT",
            }));

            await apiFetch(`/teacher/classes/${classId}/attendance`, {
                method: "PUT",
                body: JSON.stringify({
                    attendanceDate,
                    records,
                }),
            });

            setSuccess(`Attendance saved for ${attendanceDate}.`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not save attendance.",
            );
        } finally {
            setSavingAttendance(false);
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    if (loading) {
        return (
            <div className="teacher-workspace-page">
                <div className="teacher-workspace-state">
                    <div className="teacher-loading-spinner" />
                    <p>Loading class workspace...</p>
                </div>
            </div>
        );
    }

    if (error && !assignment) {
        return (
            <div className="teacher-workspace-page">
                <button
                    type="button"
                    className="teacher-back-button"
                    onClick={() => navigate("/teacher/my-teaching")}
                >
                    ← Back to My Teaching
                </button>

                <div className="teacher-workspace-error">
                    <h2>Unable to open class</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!assignment || !classDetails) {
        return null;
    }
    const students = classDetails.class.students ?? [];
    const assignments = classDetails.assignments ?? [];
    const attendanceRecords = classDetails.attendance ?? [];

    const presentCount = Object.values(attendance).filter(
        (status) => status === "PRESENT",
    ).length;

    const absentCount = Object.values(attendance).filter(
        (status) => status === "ABSENT",
    ).length;

    const lateCount = Object.values(attendance).filter(
        (status) => status === "LATE",
    ).length;

    return (
        <div className="teacher-workspace-page">
            <button
                type="button"
                className="teacher-back-button"
                onClick={() => navigate("/teacher/my-teaching")}
            >
                ← Back to My Teaching
            </button>

            <header className="teacher-workspace-header">
                <div>
                    <div className="teacher-workspace-breadcrumb">
                        My Teaching / {assignment.grade} - {assignment.section}
                    </div>

                    <h1>
                        {assignment.grade} - {assignment.section}
                    </h1>

                    <p>
                        {assignment.subjectName} ({assignment.subjectCode})
                    </p>
                </div>

                <div className="teacher-workspace-class-info">
                    <span>
                        Room <strong>{classDetails.class.room}</strong>
                    </span>

                    <span>
                        Students <strong>{students.length}</strong>
                    </span>
                </div>
            </header>

            {error && (
                <div className="teacher-workspace-alert error">{error}</div>
            )}

            {success && (
                <div className="teacher-workspace-alert success">{success}</div>
            )}

            <nav className="teacher-workspace-tabs">
                <button
                    type="button"
                    className={activeTab === "overview" ? "active" : ""}
                    onClick={() => setActiveTab("overview")}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={activeTab === "attendance" ? "active" : ""}
                    onClick={() => setActiveTab("attendance")}
                >
                    Attendance
                </button>

                <button
                    type="button"
                    className={activeTab === "assignments" ? "active" : ""}
                    onClick={() => setActiveTab("assignments")}
                >
                    Assignments
                </button>

                <button
                    type="button"
                    className={activeTab === "notes" ? "active" : ""}
                    onClick={() => setActiveTab("notes")}
                >
                    Notes
                </button>

                <button
                    type="button"
                    className={activeTab === "marks" ? "active" : ""}
                    onClick={() => setActiveTab("marks")}
                >
                    Marks
                </button>
            </nav>

            {activeTab === "overview" && (
                <section className="teacher-workspace-content">
                    <div className="workspace-stat-grid">
                        <div className="workspace-stat-card">
                            <span className="workspace-stat-icon">👨‍🎓</span>

                            <div>
                                <strong>{students.length}</strong>

                                <span>Students</span>
                            </div>
                        </div>

                        <div className="workspace-stat-card">
                            <span className="workspace-stat-icon">📋</span>

                            <div>
                                <strong>{assignments.length}</strong>

                                <span>Assignments</span>
                            </div>
                        </div>

                        <div className="workspace-stat-card">
                            <span className="workspace-stat-icon">✅</span>

                            <div>
                                <strong>{presentCount}</strong>

                                <span>Present today</span>
                            </div>
                        </div>

                        <div className="workspace-stat-card">
                            <span className="workspace-stat-icon">❌</span>

                            <div>
                                <strong>{absentCount}</strong>

                                <span>Absent today</span>
                            </div>
                        </div>
                    </div>

                    <div className="workspace-two-column">
                        <div className="workspace-panel">
                            <div className="workspace-panel-header">
                                <div>
                                    <h2>Class Information</h2>
                                    <p>
                                        Details about this teaching assignment.
                                    </p>
                                </div>
                            </div>

                            <div className="workspace-details">
                                <div>
                                    <span>Class</span>
                                    <strong>
                                        {assignment.grade} -{" "}
                                        {assignment.section}
                                    </strong>
                                </div>

                                <div>
                                    <span>Subject</span>
                                    <strong>{assignment.subjectName}</strong>
                                </div>

                                <div>
                                    <span>Subject Code</span>
                                    <strong>{assignment.subjectCode}</strong>
                                </div>

                                <div>
                                    <span>Room</span>
                                    <strong>{classDetails.class.room}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="workspace-panel">
                            <div className="workspace-panel-header">
                                <div>
                                    <h2>Recent Assignments</h2>
                                    <p>Latest work given to students.</p>
                                </div>

                                <button
                                    type="button"
                                    className="workspace-link-button"
                                    onClick={() => setActiveTab("assignments")}
                                >
                                    View all
                                </button>
                            </div>

                            {assignments.length === 0 ? (
                                <div className="workspace-empty-small">
                                    No assignments yet.
                                </div>
                            ) : (
                                <div className="workspace-assignment-list">
                                    {assignments.slice(0, 5).map((item) => (
                                        <div
                                            key={item.id}
                                            className="workspace-assignment-item"
                                        >
                                            <div>
                                                <strong>{item.title}</strong>

                                                <span>
                                                    Due {formatDate(item.dueAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {activeTab === "attendance" && (
                <section className="teacher-workspace-content">
                    <div className="workspace-panel">
                        <div className="workspace-panel-header attendance-header">
                            <div>
                                <h2>Attendance</h2>
                                <p>Record attendance for this class.</p>
                            </div>

                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(event) =>
                                    setAttendanceDate(event.target.value)
                                }
                                className="workspace-date-input"
                            />
                        </div>

                        <div className="attendance-summary">
                            <span className="attendance-present">
                                Present: {presentCount}
                            </span>

                            <span className="attendance-absent">
                                Absent: {absentCount}
                            </span>

                            <span className="attendance-late">
                                Late: {lateCount}
                            </span>
                        </div>

                        {students.length === 0 ? (
                            <div className="workspace-empty-small">
                                No students are enrolled in this class.
                            </div>
                        ) : (
                            <>
                                <div className="attendance-table-wrapper">
                                    <table className="attendance-table">
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {students.map((student) => (
                                                <tr key={student.id}>
                                                    <td>
                                                        <div className="student-cell">
                                                            <span className="student-avatar">
                                                                {student.email
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </span>

                                                            {student.email}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="attendance-options">
                                                            <button
                                                                type="button"
                                                                className={
                                                                    attendance[
                                                                        student
                                                                            .id
                                                                    ] ===
                                                                    "PRESENT"
                                                                        ? "selected present"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    updateAttendance(
                                                                        student.id,
                                                                        "PRESENT",
                                                                    )
                                                                }
                                                            >
                                                                Present
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={
                                                                    attendance[
                                                                        student
                                                                            .id
                                                                    ] ===
                                                                    "ABSENT"
                                                                        ? "selected absent"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    updateAttendance(
                                                                        student.id,
                                                                        "ABSENT",
                                                                    )
                                                                }
                                                            >
                                                                Absent
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={
                                                                    attendance[
                                                                        student
                                                                            .id
                                                                    ] === "LATE"
                                                                        ? "selected late"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    updateAttendance(
                                                                        student.id,
                                                                        "LATE",
                                                                    )
                                                                }
                                                            >
                                                                Late
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="attendance-save-row">
                                    <button
                                        type="button"
                                        className="workspace-primary-button"
                                        onClick={() => void saveAttendance()}
                                        disabled={savingAttendance}
                                    >
                                        {savingAttendance
                                            ? "Saving..."
                                            : "Save Attendance"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            )}

            {activeTab === "assignments" && (
                <section className="teacher-workspace-content">
                    <div className="workspace-panel">
                        <div className="workspace-panel-header">
                            <div>
                                <h2>Assignments</h2>

                                <p>Assignments for this class and subject.</p>
                            </div>

                            <button
                                type="button"
                                className="workspace-primary-button"
                                onClick={() => setShowCreateAssignment(true)}
                            >
                                + Create Assignment
                            </button>
                        </div>

                        {assignments.length === 0 ? (
                            <div className="workspace-empty-small">
                                No assignments have been created yet.
                            </div>
                        ) : (
                            <div className="workspace-full-assignment-list">
                                {assignments.map((item) => (
                                    <div
                                        key={item.id}
                                        className="workspace-full-assignment"
                                    >
                                        <div>
                                            <h3>{item.title}</h3>

                                            {item.description && (
                                                <p>{item.description}</p>
                                            )}
                                        </div>

                                        <div className="assignment-due">
                                            <span>Due</span>

                                            <strong>
                                                {formatDate(item.dueAt)}
                                            </strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {activeTab === "notes" && (
                <section className="teacher-workspace-content">
                    <div className="workspace-coming-soon">
                        <div>📝</div>
                        <h2>Notes</h2>
                        <p>
                            Class notes and study materials will be added here.
                        </p>
                    </div>
                </section>
            )}

            {activeTab === "marks" && (
                <section className="teacher-workspace-content">
                    <div className="workspace-coming-soon">
                        <div>📊</div>
                        <h2>Marks</h2>
                        <p>Exams and marks entry will be added here.</p>
                    </div>
                </section>
            )}
            {showCreateAssignment && (
                <CreateAssignmentModal
                    classId={classId!}
                    onClose={() => setShowCreateAssignment(false)}
                    onCreated={handleAssignmentCreated}
                />
            )}
        </div>
    );
}
