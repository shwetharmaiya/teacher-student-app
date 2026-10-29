import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import {
    createAssignment,
    getTeacherClassDetails,
    getStudentDashboard,
    getTeacherDashboard,
    getTeacherStudents,
    getStudentClasses,
    getStudentAttendance,
    isTeacherClass,
    recordAttendance,
} from "./academic.service.js";
import { getStudentGrades, getTeacherAssignmentSubmissions, getTeacherAssignments, gradeSubmission } from "../../services/grading.service.js";

const teacherRouter = Router();
const studentRouter = Router();

const assignmentSchema = z.object({
    classId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional(),
    dueAt: z.coerce.date(),
});

const attendanceSchema = z.object({
    attendanceDate: z.string().date(),
    entries: z.array(z.object({
        studentId: z.string().uuid(),
        status: z.enum(["PRESENT", "ABSENT", "LATE"]),
    })).min(1).max(200).refine(
        (entries) => new Set(entries.map((entry) => entry.studentId)).size === entries.length,
        "Each student can appear only once in an attendance roster",
    ),
});
const gradeSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.literal("GRADED"),
        marks: z.number().int().min(0).max(100),
        feedback: z.string().trim().max(2000).optional(),
    }),
    z.object({
        status: z.literal("RETURNED"),
        feedback: z.string().trim().min(1, "Feedback is required when returning work").max(2000),
    }),
]);

teacherRouter.use(authenticate, authorizeRoles("TEACHER"));
teacherRouter.get("/dashboard", async (req: AuthenticatedRequest, res) => {
    res.json(await getTeacherDashboard(req.user!.userId));
});
teacherRouter.get("/students", async (req: AuthenticatedRequest, res) => {
    try {
        return res.json({ students: await getTeacherStudents(req.user!.userId) });
    } catch (error) {
        console.error("List teacher students error:", error);
        return res.status(500).json({ message: "Could not load your students" });
    }
});
teacherRouter.get("/assignments", async (req: AuthenticatedRequest, res) => {
    try {
        return res.json({ assignments: await getTeacherAssignments(req.user!.userId) });
    } catch (error) {
        console.error("List teacher assignments error:", error);
        return res.status(500).json({ message: "Could not load assignments" });
    }
});
teacherRouter.get("/assignments/:assignmentId/submissions", async (req: AuthenticatedRequest, res) => {
    const assignmentId = z.string().uuid().safeParse(req.params.assignmentId);
    if (!assignmentId.success) return res.status(400).json({ message: "Invalid assignment ID" });
    try {
        const result = await getTeacherAssignmentSubmissions(req.user!.userId, assignmentId.data);
        if (!result) return res.status(404).json({ message: "Assignment not found" });
        return res.json(result);
    } catch (error) {
        console.error("List assignment submissions error:", error);
        return res.status(500).json({ message: "Could not load submissions" });
    }
});
teacherRouter.put("/submissions/:submissionId/grade", async (req: AuthenticatedRequest, res) => {
    const submissionId = z.string().uuid().safeParse(req.params.submissionId);
    const input = gradeSchema.safeParse(req.body);
    if (!submissionId.success) return res.status(400).json({ message: "Invalid submission ID" });
    if (!input.success) return res.status(400).json({ message: input.error.issues[0]?.message ?? "Invalid grade" });
    try {
        const submission = await gradeSubmission(req.user!.userId, submissionId.data, input.data);
        if (!submission) return res.status(404).json({ message: "Submission not found" });
        return res.json({ submission });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save grade";
        if (message.includes("only review")) return res.status(403).json({ message });
        if (message.includes("already graded") || message.includes("current state")) return res.status(409).json({ message });
        console.error("Grade submission error:", error);
        return res.status(500).json({ message: "Could not save grade" });
    }
});

teacherRouter.get("/classes/:classId", async (req: AuthenticatedRequest, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.classId);
        if (!await isTeacherClass(req.user!.userId, classId)) {
            return res.status(403).json({ message: "You can only view your assigned classes" });
        }
        const attendanceDate = z.string().date().catch(new Date().toISOString().slice(0, 10)).parse(req.query.date);
        const classRecord = await getTeacherClassDetails(req.user!.userId, classId, attendanceDate);
        if (!classRecord) return res.status(404).json({ message: "Class not found" });
        return res.json(classRecord);
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Could not load class" });
    }
});

teacherRouter.post("/assignments", async (req: AuthenticatedRequest, res) => {
    try {
        const input = assignmentSchema.parse(req.body);
        if (!await isTeacherClass(req.user!.userId, input.classId)) {
            return res.status(403).json({ message: "You can only publish work for your assigned classes" });
        }
        return res.status(201).json({ assignment: await createAssignment({ ...input, teacherId: req.user!.userId }) });
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Could not create assignment" });
    }
});

teacherRouter.put("/classes/:classId/attendance", async (req: AuthenticatedRequest, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.classId);
        if (!await isTeacherClass(req.user!.userId, classId)) {
            return res.status(403).json({ message: "You can only record attendance for your assigned classes" });
        }
        const attendance = attendanceSchema.parse(req.body);
        return res.json({ records: await recordAttendance({ classId, teacherId: req.user!.userId, ...attendance }) });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not record attendance";
        const status = message.includes("assigned classes") ? 403
            : message === "Class not found" ? 404
            : message.includes("enrolled") || message.includes("once") ? 409
            : 400;
        return res.status(status).json({ message });
    }
});

studentRouter.use(authenticate, authorizeRoles("STUDENT"));
studentRouter.get("/dashboard", async (req: AuthenticatedRequest, res) => {
    res.json(await getStudentDashboard(req.user!.userId));
});
studentRouter.get("/classes", async (req: AuthenticatedRequest, res) => {
    res.json({ classes: await getStudentClasses(req.user!.userId) });
});
studentRouter.get("/attendance", async (req: AuthenticatedRequest, res) => {
    try {
        const classId = req.query.classId === undefined ? undefined : z.string().uuid().parse(req.query.classId);
        return res.json(await getStudentAttendance(req.user!.userId, classId));
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Could not load attendance" });
    }
});
studentRouter.get("/grades", async (req: AuthenticatedRequest, res) => {
    try {
        return res.json({ grades: await getStudentGrades(req.user!.userId) });
    } catch (error) {
        console.error("Load student grades error:", error);
        return res.status(500).json({ message: "Could not load grades" });
    }
});

export { studentRouter, teacherRouter };


