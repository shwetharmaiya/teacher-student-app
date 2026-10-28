import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import {
    createManagedUser,
    deleteManagedUser,
    listUsers,
    updateManagedUser,
} from "./users.service.js";

const router = Router();
const roles = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
const querySchema = z.object({
    search: z.string().trim().max(255).default(""),
    role: z.enum(roles).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
const createSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
    role: z.enum(roles),
});
const updateSchema = z.object({
    email: z.string().trim().email().max(255).optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.enum(roles).optional(),
}).refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
});

router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid query" });
    try {
        return res.json(await listUsers(parsed.data));
    } catch (error) {
        console.error("List users error:", error);
        return res.status(500).json({ message: "Could not load users" });
    }
});

router.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid user" });
    try {
        const user = await createManagedUser(parsed.data);
        if (!user) return res.status(409).json({ message: "An account with this email already exists" });
        return res.status(201).json({ user });
    } catch (error) {
        console.error("Create user error:", error);
        return res.status(500).json({ message: "Could not create user" });
    }
});

router.put("/:id", async (req, res) => {
    const parsedId = z.string().uuid().safeParse(req.params.id);
    const parsedBody = updateSchema.safeParse(req.body);
    if (!parsedId.success) return res.status(400).json({ message: "Invalid user ID" });
    if (!parsedBody.success) return res.status(400).json({ message: parsedBody.error.issues[0]?.message ?? "Invalid user" });
    try {
        const user = await updateManagedUser(parsedId.data, parsedBody.data, req.user!.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.json({ user });
    } catch (error) {
        if (error instanceof Error && (error.message.includes("administrator") || error.message.includes("own role"))) {
            return res.status(409).json({ message: error.message });
        }
        if (isDuplicateEmail(error)) return res.status(409).json({ message: "An account with this email already exists" });
        console.error("Update user error:", error);
        return res.status(500).json({ message: "Could not update user" });
    }
});

router.delete("/:id", async (req, res) => {
    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ message: "Invalid user ID" });
    try {
        const deleted = await deleteManagedUser(parsedId.data, req.user!.userId);
        if (!deleted) return res.status(404).json({ message: "User not found" });
        return res.status(204).send();
    } catch (error) {
        if (error instanceof Error && (error.message.includes("administrator") || error.message.includes("own account"))) {
            return res.status(409).json({ message: error.message });
        }
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Could not delete user" });
    }
});

function isDuplicateEmail(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export default router;
