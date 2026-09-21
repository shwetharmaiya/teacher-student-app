import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/api/client";

type ClassRecord = {
  id: string;
  grade: string;
  section: string;
  teacher: string;
  teacherId: string | null;
  room: string;
  students: number;
  capacity: number;
};

type ClassApiRecord = {
  id: string;
  grade: string;
  section: string;
  teacherName: string | null;
  teacherId: string | null;
  room: string;
  studentCount: number;
  capacity: number;
};

type ClassForm = Omit<ClassRecord, "id" | "students">;

type Person = { id: string; email: string; role: "TEACHER" | "STUDENT" };

const emptyForm: ClassForm = { grade: "Grade 1", section: "A", teacher: "", teacherId: null, room: "", capacity: 30 };

function toClassRecord(classItem: ClassApiRecord): ClassRecord {
  return {
    id: classItem.id,
    grade: classItem.grade,
    section: classItem.section,
    teacher: classItem.teacherName ?? "",
    teacherId: classItem.teacherId,
    room: classItem.room,
    students: classItem.studentCount,
    capacity: classItem.capacity,
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All grades");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [enrollmentClass, setEnrollmentClass] = useState<ClassRecord | null>(null);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [initialStudentIds, setInitialStudentIds] = useState<string[]>([]);
  const [isSavingEnrollments, setIsSavingEnrollments] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const [classResponse, peopleResponse] = await Promise.all([
          apiFetch<{ classes: ClassApiRecord[] }>("/classes"),
          apiFetch<{ people: Person[] }>("/classes/people"),
        ]);
        setClasses(classResponse.classes.map(toClassRecord));
        setPeople(peopleResponse.people);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load classes");
      } finally {
        setIsLoading(false);
      }
    };

    void loadClasses();
  }, []);

  const grades = useMemo(
    () => Array.from(new Set(classes.map((classItem) => classItem.grade))).sort(),
    [classes],
  );

  const visibleClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return classes.filter((classItem) => {
      const matchesGrade = gradeFilter === "All grades" || classItem.grade === gradeFilter;
      const matchesSearch = !query || [classItem.grade, classItem.section, classItem.teacher, classItem.room]
        .some((value) => value.toLowerCase().includes(query));
      return matchesGrade && matchesSearch;
    });
  }, [classes, gradeFilter, search]);

  const openCreateForm = () => {
    setEditingClass(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (classItem: ClassRecord) => {
    setEditingClass(classItem);
    setForm({
      grade: classItem.grade,
      section: classItem.section,
      teacher: classItem.teacher,
      teacherId: classItem.teacherId,
      room: classItem.room,
      capacity: classItem.capacity,
    });
    setIsFormOpen(true);
  };

  const saveClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const payload = { grade: form.grade, section: form.section, teacherName: form.teacher || undefined, teacherId: form.teacherId ?? undefined, room: form.room, capacity: form.capacity };

    try {
      const response = editingClass
        ? await apiFetch<{ class: ClassApiRecord }>(`/classes/${editingClass.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch<{ class: ClassApiRecord }>("/classes", { method: "POST", body: JSON.stringify(payload) });
      const savedClass = toClassRecord(response.class);
      setClasses((current) => editingClass
        ? current.map((classItem) => classItem.id === savedClass.id ? savedClass : classItem)
        : [...current, savedClass]);
      setIsFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save class");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClass = async (id: string) => {
    const classItem = classes.find((item) => item.id === id);
    if (classItem && window.confirm(`Remove ${classItem.grade} ${classItem.section}?`)) {
      try {
        setError("");
        await apiFetch<void>(`/classes/${id}`, { method: "DELETE" });
        setClasses((current) => current.filter((item) => item.id !== id));
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Could not remove class");
      }
    }
  };

  const openEnrollmentManager = async (classItem: ClassRecord) => {
    setError("");
    try {
      const response = await apiFetch<{ students: { id: string; email: string }[] }>(`/classes/${classItem.id}/enrollments`);
      const ids = response.students.map((student) => student.id);
      setEnrollmentClass(classItem);
      setInitialStudentIds(ids);
      setEnrolledStudentIds(ids);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load enrolled students");
    }
  };

  const saveEnrollments = async () => {
    if (!enrollmentClass) return;
    setIsSavingEnrollments(true);
    setError("");
    try {
      const addedIds = enrolledStudentIds.filter((id) => !initialStudentIds.includes(id));
      const removedIds = initialStudentIds.filter((id) => !enrolledStudentIds.includes(id));
      await Promise.all([
        ...addedIds.map((studentId) => apiFetch(`/classes/${enrollmentClass.id}/enrollments`, { method: "POST", body: JSON.stringify({ studentId }) })),
        ...removedIds.map((studentId) => apiFetch(`/classes/${enrollmentClass.id}/enrollments/${studentId}`, { method: "DELETE" })),
      ]);
      setClasses((current) => current.map((classItem) => classItem.id === enrollmentClass.id ? { ...classItem, students: enrolledStudentIds.length } : classItem));
      setEnrollmentClass(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save student enrolments");
    } finally {
      setIsSavingEnrollments(false);
    }
  };

  const totalStudents = classes.reduce((sum, classItem) => sum + classItem.students, 0);
  const totalCapacity = classes.reduce((sum, classItem) => sum + classItem.capacity, 0);

  return (
    <section className="classes-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic structure</p>
          <h2>Classes and sections</h2>
          <p className="page-intro">Organize each grade, its sections, and the teacher responsible for it.</p>
        </div>
        <button className="button" type="button" onClick={openCreateForm}>+ Add class</button>
      </div>

      <div className="class-summary" aria-label="Class summary">
        <article><span>Active classes</span><strong>{classes.length}</strong><small>Across {grades.length} grades</small></article>
        <article><span>Enrolled students</span><strong>{totalStudents}</strong><small>of {totalCapacity} available seats</small></article>
        <article><span>Average class size</span><strong>{classes.length ? Math.round(totalStudents / classes.length) : 0}</strong><small>students per section</small></article>
      </div>

      {error && <p className="classes-error" role="alert">{error}</p>}

      <article className="classes-card">
        <div className="classes-toolbar">
          <label className="search-field">
            <span className="sr-only">Search classes</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search class, teacher, or room" />
          </label>
          <label className="filter-field">
            <span>Grade</span>
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              <option>All grades</option>
              {grades.map((grade) => <option key={grade}>{grade}</option>)}
            </select>
          </label>
        </div>

        <div className="table-scroll">
          <table className="classes-table">
            <thead><tr><th>Class</th><th>Class teacher</th><th>Room</th><th>Students</th><th>Capacity</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visibleClasses.map((classItem) => {
                const fill = Math.min(100, Math.round((classItem.students / classItem.capacity) * 100));
                return <tr key={classItem.id}>
                  <td><strong>{classItem.grade} <span className="section-badge">{classItem.section}</span></strong></td>
                  <td>{classItem.teacher || <span className="muted">Unassigned</span>}</td>
                  <td>{classItem.room}</td>
                  <td>{classItem.students}</td>
                  <td><div className="capacity"><span>{classItem.students} / {classItem.capacity}</span><i><b style={{ width: `${fill}%` }} /></i></div></td>
                  <td className="row-actions"><button type="button" onClick={() => openEnrollmentManager(classItem)}>Students</button><button type="button" onClick={() => openEditForm(classItem)}>Edit</button><button className="danger-action" type="button" onClick={() => deleteClass(classItem.id)}>Remove</button></td>
                </tr>;
              })}
            </tbody>
          </table>
          {isLoading && <div className="empty-state"><strong>Loading classes…</strong></div>}
          {!isLoading && visibleClasses.length === 0 && <div className="empty-state"><strong>No classes match those filters.</strong><span>Try another search, or add a new class.</span></div>}
        </div>
      </article>

      {isFormOpen && <div className="dialog-backdrop" role="presentation">
        <form className="class-form" onSubmit={saveClass} aria-labelledby="class-form-title">
          <div className="form-heading"><div><p className="eyebrow">{editingClass ? "Update class" : "New class"}</p><h3 id="class-form-title">{editingClass ? "Edit class details" : "Add a class"}</h3></div><button className="close-button" type="button" aria-label="Close" onClick={() => setIsFormOpen(false)}>×</button></div>
          <div className="form-grid">
            <label>Grade<select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1}>Grade {index + 1}</option>)}</select></label>
            <label>Section<input required maxLength={3} value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value.toUpperCase() })} placeholder="A" /></label>
            <label>Class teacher<select value={form.teacherId ?? ""} onChange={(event) => { const teacher = people.find((person) => person.id === event.target.value); setForm({ ...form, teacherId: teacher?.id ?? null, teacher: teacher?.email ?? "" }); }}><option value="">Unassigned</option>{people.filter((person) => person.role === "TEACHER").map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.email}</option>)}</select></label>
            <label>Room<input required value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="e.g. 204" /></label>
            <label>Student capacity<input required min={1} type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></label>
          </div>
          <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</button><button className="button" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : editingClass ? "Save changes" : "Create class"}</button></div>
        </form>
      </div>}

      {enrollmentClass && <div className="dialog-backdrop" role="presentation">
        <section className="class-form enrollment-form" aria-labelledby="enrolment-title">
          <div className="form-heading"><div><p className="eyebrow">Class roster</p><h3 id="enrolment-title">Manage students: {enrollmentClass.grade} {enrollmentClass.section}</h3></div><button className="close-button" type="button" aria-label="Close" onClick={() => setEnrollmentClass(null)} disabled={isSavingEnrollments}>×</button></div>
          <p className="enrolment-help">Select the registered student accounts that belong in this class. Changes are saved together.</p>
          <div className="student-picker">{people.filter((person) => person.role === "STUDENT").map((student) => <label key={student.id}><input type="checkbox" checked={enrolledStudentIds.includes(student.id)} onChange={(event) => setEnrolledStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />{student.email}</label>)}{people.filter((person) => person.role === "STUDENT").length === 0 && <p>No student accounts have been registered yet.</p>}</div>
          <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setEnrollmentClass(null)} disabled={isSavingEnrollments}>Cancel</button><button className="button" type="button" onClick={saveEnrollments} disabled={isSavingEnrollments}>{isSavingEnrollments ? "Saving…" : "Save students"}</button></div>
        </section>
      </div>}
    </section>
  );
}
