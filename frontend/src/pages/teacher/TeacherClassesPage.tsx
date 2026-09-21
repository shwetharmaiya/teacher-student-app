import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";

type TeacherClass = { id: string; grade: string; section: string; room: string; studentCount: number };
type ClassDetails = { id: string; grade: string; section: string; room: string; students: { id: string; email: string; attendanceStatus: AttendanceStatus | null }[] };
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

const today = new Date().toISOString().slice(0, 10);

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [details, setDetails] = useState<ClassDetails | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const dashboard = await apiFetch<{ classes: TeacherClass[] }>("/teacher/dashboard");
        setClasses(dashboard.classes);
        setSelectedClassId(dashboard.classes[0]?.id ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load your classes");
      } finally {
        setIsLoading(false);
      }
    };
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }
    const loadDetails = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch<{ class: ClassDetails; attendanceDate: string }>(`/teacher/classes/${selectedClassId}?date=${attendanceDate}`);
        setDetails(response.class);
        setAttendance(Object.fromEntries(response.class.students.map((student) => [student.id, student.attendanceStatus ?? "PRESENT"])));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the class roster");
      } finally {
        setIsLoading(false);
      }
    };
    void loadDetails();
  }, [selectedClassId, attendanceDate]);

  const saveAttendance = async () => {
    if (!details) return;
    setIsSaving(true);
    setError("");
    try {
      await apiFetch(`/teacher/classes/${details.id}/attendance`, {
        method: "PUT",
        body: JSON.stringify({ attendanceDate, entries: details.students.map((student) => ({ studentId: student.id, status: attendance[student.id] ?? "PRESENT" })) }),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  return <section>
    <div className="page-heading"><div><p className="eyebrow">Teaching</p><h2>My classes</h2><p className="page-intro">Review your class roster and record daily attendance.</p></div></div>
    {error && <p className="classes-error" role="alert">{error}</p>}
    {!isLoading && classes.length === 0 && <article className="panel"><h3>No assigned classes</h3><p>An administrator needs to connect your teacher account to a class before it appears here.</p></article>}
    {classes.length > 0 && <article className="classes-card teacher-classes-card"><div className="classes-toolbar"><label className="filter-field"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.grade} {classItem.section} · Room {classItem.room}</option>)}</select></label><label className="filter-field"><span>Attendance date</span><input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></label></div>
      {isLoading && <div className="empty-state"><strong>Loading class roster…</strong></div>}
      {!isLoading && details && <><div className="roster-heading"><div><h3>{details.grade} {details.section}</h3><span>Room {details.room} · {details.students.length} students</span></div><button className="button" type="button" onClick={saveAttendance} disabled={isSaving || details.students.length === 0}>{isSaving ? "Saving…" : "Save attendance"}</button></div><div className="table-scroll"><table className="classes-table"><thead><tr><th>Student</th><th>Attendance</th></tr></thead><tbody>{details.students.map((student) => <tr key={student.id}><td><strong>{student.email}</strong></td><td><select className="attendance-select" value={attendance[student.id] ?? "PRESENT"} onChange={(event) => setAttendance((current) => ({ ...current, [student.id]: event.target.value as AttendanceStatus }))}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option></select></td></tr>)}</tbody></table></div>{details.students.length === 0 && <div className="empty-state"><strong>No students are enrolled in this class.</strong></div>}</>}
    </article>}
  </section>;
}
