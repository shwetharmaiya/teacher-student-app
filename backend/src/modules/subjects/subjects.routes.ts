import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { createSubject, deleteSubject, listSubjects, updateSubject } from "./subjects.service.js";
import { createTeacherSubjectAssignment, deleteTeacherSubjectAssignment, listAssignmentsForTeacher, listTeacherSubjectAssignments } from "./assignment.service.js";

const router = Router();
const subjectSchema = z.object({
    name: z.string().trim().min(1).max(120),
    code: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()),
});

router.use(authenticate);
router.get("/", authorizeRoles("ADMIN", "TEACHER"), async (_req, res) => {
    try {
        return res.json({ subjects: await listSubjects() });
    } catch (error) {
        console.error("List subjects error:", error);
        return res.status(500).json({ message: "Could not load subjects" });
    }
});

router.post("/", authorizeRoles("ADMIN"), async (req, res) => {
    const parsed = subjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid subject" });
    try {
        const subject = await createSubject(parsed.data);
        return res.status(201).json({ subject });
    } catch (error) {
        if (isDuplicateCode(error)) return res.status(409).json({ message: "A subject with this code already exists" });
        console.error("Create subject error:", error);
        return res.status(500).json({ message: "Could not create subject" });
    }
});

router.put("/:id", authorizeRoles("ADMIN"), async (req, res) => {
    const parsedId = z.string().uuid().safeParse(req.params.id);
    const parsedBody = subjectSchema.safeParse(req.body);
    if (!parsedId.success) return res.status(400).json({ message: "Invalid subject ID" });
    if (!parsedBody.success) return res.status(400).json({ message: parsedBody.error.issues[0]?.message ?? "Invalid subject" });
    try {
        const subject = await updateSubject(parsedId.data, parsedBody.data);
        if (!subject) return res.status(404).json({ message: "Subject not found" });
        return res.json({ subject });
    } catch (error) {
        if (isDuplicateCode(error)) return res.status(409).json({ message: "A subject with this code already exists" });
        console.error("Update subject error:", error);
        return res.status(500).json({ message: "Could not update subject" });
    }
});

router.delete("/:id", authorizeRoles("ADMIN"), async (req, res) => {
    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ message: "Invalid subject ID" });
    try {
        const subject = await deleteSubject(parsedId.data);
        if (!subject) return res.status(404).json({ message: "Subject not found" });
        return res.status(204).send();
    } catch (error) {
        console.error("Delete subject error:", error);
        return res.status(500).json({ message: "Could not delete subject" });
    }
});

function isDuplicateCode(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}



const teacherAssignmentSchema = z.object({
    teacherId: z.string().uuid(),
    classId: z.string().uuid(),
    subjectId: z.string().uuid(),
});

router.get("/assignments", authorizeRoles("ADMIN"), async (_req, res) => {
    try {
        return res.json({ assignments: await listTeacherSubjectAssignments() });
    } catch (error) {
        console.error("List teaching assignments error:", error);
        return res.status(500).json({ message: "Could not load teaching assignments" });
    }
});

router.post("/assignments", authorizeRoles("ADMIN"), async (req, res) => {
    const parsed = teacherAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid teaching assignment" });
    try {
        const assignment = await createTeacherSubjectAssignment(parsed.data);
        if (!assignment) return res.status(409).json({ message: "This teacher is already assigned to this class and subject" });
        return res.status(201).json({ assignment });
    } catch (error) {
        if (error instanceof Error && error.message.includes("registered teacher")) return res.status(400).json({ message: error.message });
        console.error("Create teaching assignment error:", error);
        return res.status(400).json({ message: "Could not create teaching assignment" });
    }
});

router.delete("/assignments/:id", authorizeRoles("ADMIN"), async (req, res) => {
    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ message: "Invalid assignment ID" });
    try {
        const assignment = await deleteTeacherSubjectAssignment(parsedId.data);
        if (!assignment) return res.status(404).json({ message: "Teaching assignment not found" });
        return res.status(204).send();
    } catch (error) {
        console.error("Delete teaching assignment error:", error);
        return res.status(500).json({ message: "Could not delete teaching assignment" });
    }
});

router.get("/my-assignments", authorizeRoles("TEACHER"), async (req, res) => {
    try {
        return res.json({ assignments: await listAssignmentsForTeacher(req.user!.userId) });
    } catch (error) {
        console.error("List teacher assignments error:", error);
        return res.status(500).json({ message: "Could not load your teaching assignments" });
    }
});

export default router;

