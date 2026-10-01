import { Router } from "express";
import { z } from "zod";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/role.middleware.js";

import {
    createSubject,
    deleteSubject,
    listSubjects,
    updateSubject,
} from "./subjects.service.js";

import {
    createTeacherSubjectAssignment,
    deleteTeacherSubjectAssignment,
    listAssignmentsForTeacher,
    listTeacherSubjectAssignments,
} from "./assignment.service.js";

const router = Router();

const subjectSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1)
        .max(120),

    code: z
        .string()
        .trim()
        .min(1)
        .max(32),
});

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| Subjects
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authorizeRoles("ADMIN", "TEACHER"),
    async (_req, res) => {
        try {
            const data = await listSubjects();

            return res.json({
                subjects: data,
            });
        } catch (error) {
            return res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load subjects",
            });
        }
    },
);

router.post(
    "/",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const input =
                subjectSchema.parse(req.body);

            const subject =
                await createSubject(input);

            return res.status(201).json({
                subject,
            });
        } catch (error) {
            return res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not create subject",
            });
        }
    },
);

router.put(
    "/:id",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const id =
                z.string().uuid().parse(req.params.id);

            const input =
                subjectSchema.parse(req.body);

            const subject =
                await updateSubject(id, input);

            if (!subject) {
                return res.status(404).json({
                    message: "Subject not found",
                });
            }

            return res.json({
                subject,
            });
        } catch (error) {
            return res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not update subject",
            });
        }
    },
);

router.delete(
    "/:id",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const id =
                z.string().uuid().parse(req.params.id);

            const subject =
                await deleteSubject(id);

            if (!subject) {
                return res.status(404).json({
                    message: "Subject not found",
                });
            }

            return res.status(204).send();
        } catch (error) {
            return res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not delete subject",
            });
        }
    },
);

/*
|--------------------------------------------------------------------------
| Teacher / Class / Subject assignments
|--------------------------------------------------------------------------
*/

const assignmentSchema = z.object({
    teacherId: z.string().uuid(),
    classId: z.string().uuid(),
    subjectId: z.string().uuid(),
});

router.get(
    "/assignments",
    authorizeRoles("ADMIN"),
    async (_req, res) => {
        try {
            const assignments =
                await listTeacherSubjectAssignments();

            return res.json({
                assignments,
            });
        } catch (error) {
            return res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load assignments",
            });
        }
    },
);

router.post(
    "/assignments",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const input =
                assignmentSchema.parse(req.body);

            const assignment =
                await createTeacherSubjectAssignment(
                    input,
                );

            if (!assignment) {
                return res.status(409).json({
                    message:
                        "This teacher is already assigned to this class and subject",
                });
            }

            return res.status(201).json({
                assignment,
            });
        } catch (error) {
            return res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not create assignment",
            });
        }
    },
);

router.delete(
    "/assignments/:id",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const id =
                z.string().uuid().parse(req.params.id);

            const assignment =
                await deleteTeacherSubjectAssignment(
                    id,
                );

            if (!assignment) {
                return res.status(404).json({
                    message:
                        "Assignment not found",
                });
            }

            return res.status(204).send();
        } catch (error) {
            return res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not delete assignment",
            });
        }
    },
);

router.get(
    "/my-assignments",
    authorizeRoles("TEACHER"),
    async (req, res) => {
        try {
            const assignments =
                await listAssignmentsForTeacher(
                    req.user!.userId,
                );

            return res.json({
                assignments,
            });
        } catch (error) {
            return res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load your assignments",
            });
        }
    },
);

export default router;