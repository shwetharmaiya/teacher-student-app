import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { createParentLink, deleteParentLink, listParentLinks } from "./parentLinks.service.js";

const router = Router();
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", async (_req, res) => {
    try {
        return res.json({ links: await listParentLinks() });
    } catch (error) {
        console.error("List parent links error:", error);
        return res.status(500).json({ message: "Could not load parent links" });
    }
});

router.post("/", async (req, res) => {
    const input = z.object({ parentId: z.string().uuid(), studentId: z.string().uuid() }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: input.error.issues[0]?.message ?? "Invalid parent link" });
    if (input.data.parentId === input.data.studentId) return res.status(400).json({ message: "Parent and student accounts must be different" });
    try {
        const link = await createParentLink(input.data.parentId, input.data.studentId, req.user!.userId);
        if (!link) return res.status(409).json({ message: "This parent is already linked to this student" });
        return res.status(201).json({ link });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create parent link";
        if (message.includes("role") || message.includes("administrator")) return res.status(400).json({ message });
        console.error("Create parent link error:", error);
        return res.status(500).json({ message: "Could not create parent link" });
    }
});

router.delete("/:id", async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ message: "Invalid parent link ID" });
    try {
        const deleted = await deleteParentLink(id.data);
        if (!deleted) return res.status(404).json({ message: "Parent link not found" });
        return res.status(204).send();
    } catch (error) {
        console.error("Delete parent link error:", error);
        return res.status(500).json({ message: "Could not remove parent link" });
    }
});

export default router;
