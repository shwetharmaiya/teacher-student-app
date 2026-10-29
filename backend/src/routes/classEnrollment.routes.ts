import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { enrollStudent } from "../services/classEnrollment.service.js";

const router = Router();
const enrollmentSchema = z.object({
    studentId: z.string().uuid(),
    classId: z.string().uuid(),
});

router.post("/", authenticate, authorizeRoles("ADMIN"), async (req, res) => {
    const parsed = enrollmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Student and class IDs must be valid UUIDs" });
    try {
        const enrollment = await enrollStudent(parsed.data.studentId, parsed.data.classId, req.user!.userId);
        return res.status(201).json({ enrollment });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Student not found" || error.message === "Class not found") return res.status(404).json({ message: error.message });
            if (error.message === "User is not a student") return res.status(400).json({ message: error.message });
            if (error.message === "Class is at capacity" || error.message === "Student is already enrolled in this class") return res.status(409).json({ message: error.message });
        }
        console.error("Enroll student error:", error);
        return res.status(500).json({ message: "Failed to enroll student" });
    }
});

export default router;
