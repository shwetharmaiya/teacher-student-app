import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { createAnnouncement, listAnnouncements } from "./announcements.service.js";

const router = Router();
const announcementSchema = z.object({
    audience: z.enum(["SCHOOL", "CLASS"]),
    classId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(5000),
}).refine((input) => input.audience === "CLASS" ? Boolean(input.classId) : input.classId === undefined, {
    message: "Choose a class for class announcements; school announcements do not use a class ID",
});

router.use(authenticate);
router.get("/", async (req: AuthenticatedRequest, res) => {
    try {
        return res.json({ announcements: await listAnnouncements(req.user!.userId, req.user!.role) });
    } catch (error) {
        console.error("List announcements error:", error);
        return res.status(500).json({ message: "Could not load announcements" });
    }
});

router.post("/", authorizeRoles("ADMIN", "TEACHER"), async (req: AuthenticatedRequest, res) => {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid announcement" });
    try {
        const announcement = await createAnnouncement(req.user!.userId, req.user!.role, parsed.data);
        return res.status(201).json({ announcement });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not publish announcement";
        if (message.includes("assigned to you")) return res.status(403).json({ message });
        if (message === "Class not found") return res.status(404).json({ message });
        console.error("Publish announcement error:", error);
        return res.status(500).json({ message: "Could not publish announcement" });
    }
});

export default router;
