import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { bootstrapAdminAccount, loginUser } from "./auth.service.js";
import { getMe } from "./auth.controller.js";

const router = Router();
const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});
const bootstrapSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(12).max(128),
    bootstrapKey: z.string().min(1).max(256),
});

// Accounts are provisioned by an administrator. Keep this endpoint explicit for
// older clients and explain the supported path instead of silently self-signing.
router.post("/register", (_req, res) => res.status(403).json({
    message: "Public registration is disabled. Ask a school administrator to create your account.",
}));

router.post("/bootstrap-admin", async (req, res) => {
    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid bootstrap request" });
    try {
        const user = await bootstrapAdminAccount(parsed.data);
        return res.status(201).json({ user });
    } catch (error) {
        if (error instanceof Error && "statusCode" in error) {
            return res.status(Number(error.statusCode)).json({ message: error.message });
        }
        console.error("Bootstrap admin error:", error);
        return res.status(500).json({ message: "Could not provision administrator" });
    }
});

router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid login request" });
    try {
        return res.json(await loginUser(parsed.data.email.toLowerCase(), parsed.data.password));
    } catch (error) {
        return res.status(401).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
});

router.get("/me", authenticate, getMe);

export default router;
