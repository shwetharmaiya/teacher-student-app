import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";

import {
    getStudentAssignments,
    submitAssignment,
} from "../services/studentAssignment.service.js";

const router = Router();

router.get("/assignments", authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        if (req.user.role !== "STUDENT") {
            return res.status(403).json({
                message: "Student access required",
            });
        }

        const studentId = req.user.id;

        const assignments = await getStudentAssignments(studentId);

        return res.json({
            assignments,
        });
    } catch (error) {
        console.error("Get student assignments error:", error);

        return res.status(500).json({
            message: "Failed to fetch assignments",
        });
    }
});

router.post(
    "/assignments/:assignmentId/submissions",
    authenticate,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: "Authentication required",
                });
            }

            if (req.user.role !== "STUDENT") {
                return res.status(403).json({
                    message: "Student access required",
                });
            }

            const studentId = req.user.id;
            const assignmentId = req.params.assignmentId;

            const { content } = req.body;

            if (typeof assignmentId !== "string") {
                return res.status(400).json({
                    message: "Invalid assignment ID",
                });
            }

            if (typeof content !== "string" || !content.trim()) {
                return res.status(400).json({
                    message: "Submission content is required",
                });
            }

            const submission = await submitAssignment(
                studentId,
                assignmentId,
                content.trim(),
            );

            return res.status(201).json({
                submission,
            });
        } catch (error) {
            console.error("Submit assignment error:", error);

            if (
                error instanceof Error &&
                error.message === "Assignment not found"
            ) {
                return res.status(404).json({
                    message: error.message,
                });
            }

            if (
                error instanceof Error &&
                error.message === "You are not enrolled in this class"
            ) {
                return res.status(403).json({
                    message: error.message,
                });
            }

            return res.status(500).json({
                message: "Failed to submit assignment",
            });
        }
    },
);

export default router;
