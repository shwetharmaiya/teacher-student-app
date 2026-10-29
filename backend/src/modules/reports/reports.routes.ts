import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getAttendanceReport, getGradeReport, ReportScopeError } from "./reports.service.js";

const router = Router();
const filterSchema = z.object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    classId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine((filters) => !filters.from || !filters.to || filters.from <= filters.to, {
    message: "The start date must be on or before the end date",
});

router.use(authenticate);
router.get("/attendance", async (req: AuthenticatedRequest, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid attendance filters" });
    try {
        return res.json(await getAttendanceReport(req.user!.userId, req.user!.role, parsed.data));
    } catch (error) {
        if (error instanceof ReportScopeError) return res.status(404).json({ message: error.message });
        console.error("Attendance report error:", error);
        return res.status(500).json({ message: "Could not load attendance report" });
    }
});

router.get("/grades", async (req: AuthenticatedRequest, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid grade filters" });
    try {
        return res.json(await getGradeReport(req.user!.userId, req.user!.role, parsed.data));
    } catch (error) {
        if (error instanceof ReportScopeError) return res.status(404).json({ message: error.message });
        console.error("Grade report error:", error);
        return res.status(500).json({ message: "Could not load grade report" });
    }
});

export default router;
