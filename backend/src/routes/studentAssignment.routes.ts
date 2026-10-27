import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
    getStudentAssignmentDetails,
    getStudentAssignments,
    MAX_SUBMISSION_CONTENT_LENGTH,
    submitAssignment,
} from "../services/studentAssignment.service.js";

const router = Router();
const assignmentIdSchema = z.string().uuid();
const submissionSchema = z.object({
    content: z.string().trim().min(1, "Submission content is required").max(
        MAX_SUBMISSION_CONTENT_LENGTH,
        `Submission content must be ${MAX_SUBMISSION_CONTENT_LENGTH} characters or fewer`,
    ),
});

router.use(authenticate, authorizeRoles("STUDENT"));

router.get("/assignments", async (req, res) => {
    try {
        const assignments = await getStudentAssignments(req.user!.userId);
        return res.json({ assignments });
    } catch (error) {
        console.error("Get student assignments error:", error);
        return res.status(500).json({ message: "Failed to fetch assignments" });
    }
});

router.get("/assignments/:assignmentId", async (req, res) => {
    const parsedId = assignmentIdSchema.safeParse(req.params.assignmentId);
    if (!parsedId.success) {
        return res.status(400).json({ message: "Invalid assignment ID" });
    }

    try {
        const assignment = await getStudentAssignmentDetails(
            req.user!.userId,
            parsedId.data,
        );
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }
        return res.json({ assignment });
    } catch (error) {
        console.error("Get student assignment error:", error);
        return res.status(500).json({ message: "Failed to fetch assignment" });
    }
});

router.post("/assignments/:assignmentId/submissions", async (req, res) => {
    const parsedId = assignmentIdSchema.safeParse(req.params.assignmentId);
    if (!parsedId.success) {
        return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const parsedBody = submissionSchema.safeParse(req.body);
    if (!parsedBody.success) {
        return res.status(400).json({
            message: parsedBody.error.issues[0]?.message ?? "Invalid submission",
        });
    }

    try {
        const result = await submitAssignment(
            req.user!.userId,
            parsedId.data,
            parsedBody.data.content,
        );
        return res.status(result.resubmitted ? 200 : 201).json(result);
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Assignment not found")) {
            return res.status(404).json({ message: "Assignment not found" });
        }
        if (error instanceof Error && error.message.includes("has been graded")) {
            return res.status(409).json({ message: error.message });
        }
        console.error("Submit assignment error:", error);
        return res.status(500).json({ message: "Failed to submit assignment" });
    }
});

export default router;
