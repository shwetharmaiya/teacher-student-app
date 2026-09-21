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
    isTeacherClass,
    recordAttendance,
} from "./academic.service.js";

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
    })).min(1),
});

teacherRouter.use(authenticate, authorizeRoles("TEACHER"));
teacherRouter.get("/dashboard", async (req: AuthenticatedRequest, res) => {
    res.json(await getTeacherDashboard(req.user!.userId));
});

teacherRouter.get("/classes/:classId", async (req: AuthenticatedRequest, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.classId);
        if (!await isTeacherClass(req.user!.userId, classId)) {
            return res.status(403).json({ message: "You can only view your assigned classes" });
        }
        const attendanceDate = z.string().date().catch(new Date().toISOString().slice(0, 10)).parse(req.query.date);
        const classRecord = await getTeacherClassDetails(classId, attendanceDate);
        return res.json({ class: classRecord, attendanceDate });
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
        return res.json({ records: await recordAttendance({ classId, ...attendance }) });
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Could not record attendance" });
    }
});

studentRouter.use(authenticate, authorizeRoles("STUDENT"));
studentRouter.get("/dashboard", async (req: AuthenticatedRequest, res) => {
    res.json(await getStudentDashboard(req.user!.userId));
});

export { studentRouter, teacherRouter };
