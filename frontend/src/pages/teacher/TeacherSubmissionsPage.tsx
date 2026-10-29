import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/api/client";

type Assignment = { id: string; title: string; dueAt: string; grade: string; section: string };
type Submission = {
    id: string;
    studentId: string;
    studentEmail: string;
    content: string | null;
    fileUrl: string | null;
    submittedAt: string;
    status: "SUBMITTED" | "RETURNED" | "GRADED";
    marks: number | null;
    feedback: string | null;
    gradedAt: string | null;
};
type ReviewInput = { status: "GRADED"; marks: number; feedback?: string } | { status: "RETURNED"; feedback: string };

function SubmissionCard({ submission, onReview }: { submission: Submission; onReview: (id: string, input: ReviewInput) => Promise<void> }) {
    const [marks, setMarks] = useState(submission.marks?.toString() ?? "");
    const [feedback, setFeedback] = useState(submission.feedback ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const locked = submission.status === "GRADED";

    async function review(status: ReviewInput["status"]) {
        setError("");
        let input: ReviewInput;
        if (status === "GRADED") {
            const score = Number(marks);
            if (!Number.isInteger(score) || score < 0 || score > 100) {
                setError("Enter a whole-number mark from 0 to 100.");
                return;
            }
            input = { status, marks: score, feedback: feedback.trim() };
        } else {
            if (!feedback.trim()) {
                setError("Add feedback describing what the student should revise.");
                return;
            }
            if (feedback.length > 2000) {
                setError("Feedback must be 2,000 characters or fewer.");
                return;
            }
            input = { status, feedback: feedback.trim() };
        }
        setSaving(true);
        try {
            await onReview(submission.id, input);
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : "Could not save review.");
        } finally {
            setSaving(false);
        }
    }

    return <article className="panel teacher-submission-card">
        <div className="teacher-submission-heading"><div><h3>{submission.studentEmail}</h3><span>Submitted {new Date(submission.submittedAt).toLocaleString()}</span></div><span className={`student-attendance-status ${submission.status.toLowerCase()}`}>{submission.status === "GRADED" ? "Graded" : submission.status === "RETURNED" ? "Returned" : "Submitted"}</span></div>
        <div className="teacher-submission-content">{submission.content || (submission.fileUrl ? <a href={submission.fileUrl} target="_blank" rel="noreferrer">Open submitted file</a> : <em>No text or file attached.</em>)}</div>
        {submission.status === "GRADED" && <div className="teacher-locked-grade"><strong>Grade: {submission.marks}/100</strong>{submission.feedback && <p>{submission.feedback}</p>}<span>Graded {submission.gradedAt ? new Date(submission.gradedAt).toLocaleString() : ""}. Grades are locked.</span></div>}
        {!locked && <div className="teacher-review-form">
            <label>Mark (0–100)<input type="number" min={0} max={100} step={1} value={marks} onChange={(event) => setMarks(event.target.value)} placeholder="e.g. 85" /></label>
            <label>Feedback<textarea maxLength={2000} rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Give clear, actionable feedback" /><span>{feedback.length}/2000</span></label>
            {error && <p className="classes-error" role="alert">{error}</p>}
            <div className="form-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={() => void review("RETURNED")}>{saving ? "Saving…" : "Return for revision"}</button><button type="button" className="button" disabled={saving} onClick={() => void review("GRADED")}>{saving ? "Saving…" : "Save grade"}</button></div>
        </div>}
    </article>;
}

export default function TeacherSubmissionsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [assignmentId, setAssignmentId] = useState("");
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [reloadSubmissions, setReloadSubmissions] = useState(0);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadAssignments = useCallback(async () => {
        setLoadingAssignments(true);
        setError("");
        try {
            const result = await apiFetch<{ assignments: Assignment[] }>("/teacher/assignments");
            setAssignments(result.assignments);
            setAssignmentId((current) => result.assignments.some((item) => item.id === current) ? current : result.assignments[0]?.id ?? "");
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load your assignments.");
        } finally {
            setLoadingAssignments(false);
        }
    }, []);

    useEffect(() => { void loadAssignments(); }, [loadAssignments]);

    useEffect(() => {
        let active = true;
        if (!assignmentId) {
            setSubmissions([]);
            setLoadingSubmissions(false);
            return () => { active = false; };
        }
        setLoadingSubmissions(true);
        setError("");
        apiFetch<{ submissions: Submission[] }>(`/teacher/assignments/${assignmentId}/submissions`)
            .then((result) => { if (active) setSubmissions(result.submissions); })
            .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Could not load submissions."); })
            .finally(() => { if (active) setLoadingSubmissions(false); });
        return () => { active = false; };
    }, [assignmentId, reloadSubmissions]);

    async function saveReview(id: string, input: ReviewInput) {
        const result = await apiFetch<{ submission: Pick<Submission, "id" | "studentId" | "status" | "marks" | "feedback" | "gradedAt"> }>(`/teacher/submissions/${id}/grade`, {
            method: "PUT",
            body: JSON.stringify(input),
        });
        setSubmissions((current) => current.map((item) => item.id === id ? { ...item, ...result.submission } : item));
        setNotice(input.status === "GRADED" ? "Grade saved. This submission is now locked." : "Work returned with revision feedback.");
    }

    const selected = assignments.find((item) => item.id === assignmentId);
    return <section className="student-records-page teacher-review-page">
        <p className="eyebrow">Assessment</p><h2>Assignment review</h2>
        <p className="page-intro">Review work submitted to your assignments, return work with feedback, or record a final grade.</p>
        {error && <div className="student-assignments-error" role="alert">{error} <button type="button" onClick={() => assignmentId ? setReloadSubmissions((current) => current + 1) : void loadAssignments()}>Try again</button></div>}
        {notice && <p className="student-submission-success" role="status">{notice}</p>}
        {loadingAssignments ? <div className="student-assignments-state" role="status">Loading assignments…</div> : assignments.length === 0 ? <div className="student-empty-assignments"><h2>No assignments to review</h2><p>Assignments you publish will be available here for review.</p></div> : <>
            <div className="student-attendance-toolbar"><label htmlFor="review-assignment">Assignment</label><select id="review-assignment" value={assignmentId} onChange={(event) => { setAssignmentId(event.target.value); setNotice(""); }}>
                {assignments.map((item) => <option key={item.id} value={item.id}>Grade {item.grade} · {item.section} — {item.title}</option>)}
            </select></div>
            {selected && <p className="page-intro">Due {new Date(selected.dueAt).toLocaleDateString()}. Late submissions remain eligible for review.</p>}
            {loadingSubmissions ? <div className="student-assignments-state" role="status">Loading student submissions…</div> : submissions.length === 0 ? <div className="student-empty-assignments"><h2>No submissions yet</h2><p>Submissions for this assignment will appear here.</p></div> : <div className="teacher-submission-list">{submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} onReview={saveReview} />)}</div>}
        </>}
    </section>;
}
