import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import {
    createClass,
    deleteClass,
    addEnrollment,
    getClassEnrollments,
    listClasses,
    listSchoolPeople,
    removeEnrollment,
    updateClass,
} from "./classes.service.js";

const router = Router();

const classSchema = z.object({
    grade: z.string().trim().min(1).max(64),
    section: z.string().trim().min(1).max(3).transform((value) => value.toUpperCase()),
    teacherName: z.string().trim().max(120).optional(),
    teacherId: z.string().uuid().optional(),
    room: z.string().trim().min(1).max(32),
    capacity: z.coerce.number().int().min(1).max(200),
});

router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", async (_req, res) => {
    const classRecords = await listClasses();
    res.json({ classes: classRecords });
});

router.get("/people", async (_req, res) => {
    const people = await listSchoolPeople();
    res.json({ people });
});

router.get("/:id/enrollments", async (req, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.id);
        res.json({ students: await getClassEnrollments(classId) });
    } catch (error) {
        res.status(400).json({ message: getErrorMessage(error, "Could not load enrolments") });
    }
});

router.post("/:id/enrollments", async (req, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.id);
        const studentId = z.object({ studentId: z.string().uuid() }).parse(req.body).studentId;
        const people = await listSchoolPeople();
        if (!people.some((person) => person.id === studentId && person.role === "STUDENT")) {
            return res.status(400).json({ message: "Select a registered student account" });
        }
        return res.status(201).json({ enrollment: await addEnrollment(classId, studentId) });
    } catch (error) {
        return res.status(400).json({ message: getErrorMessage(error, "Could not enrol student") });
    }
});

router.delete("/:id/enrollments/:studentId", async (req, res) => {
    try {
        const classId = z.string().uuid().parse(req.params.id);
        const studentId = z.string().uuid().parse(req.params.studentId);
        const enrollment = await removeEnrollment(classId, studentId);
        if (!enrollment) return res.status(404).json({ message: "Enrolment not found" });
        return res.status(204).send();
    } catch (error) {
        return res.status(400).json({ message: getErrorMessage(error, "Could not remove enrolment") });
    }
});

router.post("/", async (req, res) => {
    try {
        const classRecord = await createClass(classSchema.parse(req.body));
        res.status(201).json({ class: classRecord });
    } catch (error) {
        res.status(400).json({ message: getErrorMessage(error, "Could not create class") });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = z.string().uuid().parse(req.params.id);
        const classRecord = await updateClass(id, classSchema.parse(req.body));

        if (!classRecord) {
            return res.status(404).json({ message: "Class not found" });
        }

        return res.json({ class: classRecord });
    } catch (error) {
        return res.status(400).json({ message: getErrorMessage(error, "Could not update class") });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = z.string().uuid().parse(req.params.id);
        const deletedClass = await deleteClass(id);

        if (!deletedClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        return res.status(204).send();
    } catch (error) {
        return res.status(400).json({ message: getErrorMessage(error, "Could not delete class") });
    }
});

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default router;
