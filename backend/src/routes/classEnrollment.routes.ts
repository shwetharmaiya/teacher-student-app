import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { enrollStudent } from "../services/classEnrollment.service.js";

const router = Router();

router.post(
  "/",
  authenticate,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      // For now, only ADMIN can enroll students.
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const { studentId, classId } = req.body;

      if (!studentId || typeof studentId !== "string") {
        return res.status(400).json({
          message: "Student ID is required",
        });
      }

      if (!classId || typeof classId !== "string") {
        return res.status(400).json({
          message: "Class ID is required",
        });
      }

      const enrollment = await enrollStudent(
        studentId,
        classId
      );

      return res.status(201).json({
        enrollment,
      });
    } catch (error) {
      console.error("Enroll student error:", error);

      if (
        error instanceof Error &&
        error.message === "Student not found"
      ) {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message === "Class not found"
      ) {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message === "User is not a student"
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "Student is already enrolled in this class"
      ) {
        return res.status(409).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Failed to enroll student",
      });
    }
  }
);

export default router;