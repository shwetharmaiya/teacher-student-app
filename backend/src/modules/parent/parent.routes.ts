import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { getParentAssignments, getParentAttendance, getParentChildren, getParentDashboard, getParentGrades } from "./parent.service.js";

const router = Router();
const childIdQuery = z.object({ childId: z.string().uuid() });
router.use(authenticate, authorizeRoles("PARENT"));

router.get("/children", async (req: AuthenticatedRequest, res) => {
    try {
        return res.json({ children: await getParentChildren(req.user!.userId) });
    } catch (error) {
        console.error("Load parent children error:", error);
        return res.status(500).json({ message: "Could not load linked children" });
    }
});

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
    const parsed = z.object({ childId: z.string().uuid().optional() }).safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid child ID" });
    try {
        const dashboard = await getParentDashboard(req.user!.userId, parsed.data.childId);
        if (!dashboard) return res.status(404).json({ message: "That student is not linked to your parent account" });
        return res.json(dashboard);
    } catch (error) {
        console.error("Load parent dashboard error:", error);
        return res.status(500).json({ message: "Could not load parent dashboard" });
    }
});

router.get("/attendance", async (req: AuthenticatedRequest, res) => {
    const parsed = childIdQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "A valid childId is required" });
    try {
        const attendance = await getParentAttendance(req.user!.userId, parsed.data.childId);
        if (!attendance) return res.status(404).json({ message: "That student is not linked to your parent account" });
        return res.json(attendance);
    } catch (error) {
        console.error("Load parent attendance error:", error);
        return res.status(500).json({ message: "Could not load attendance" });
    }
});

router.get("/assignments", async (req: AuthenticatedRequest, res) => {
    const parsed = childIdQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "A valid childId is required" });
    try {
        const assignments = await getParentAssignments(req.user!.userId, parsed.data.childId);
        if (!assignments) return res.status(404).json({ message: "That student is not linked to your parent account" });
        return res.json(assignments);
    } catch (error) {
        console.error("Load parent assignments error:", error);
        return res.status(500).json({ message: "Could not load assignments" });
    }
});

router.get("/grades", async (req: AuthenticatedRequest, res) => {
    const parsed = childIdQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "A valid childId is required" });
    try {
        const result = await getParentGrades(req.user!.userId, parsed.data.childId);
        if (!result) return res.status(404).json({ message: "That student is not linked to your parent account" });
        return res.json(result);
    } catch (error) {
        console.error("Load parent grades error:", error);
        return res.status(500).json({ message: "Could not load grades" });
    }
});

export default router;
