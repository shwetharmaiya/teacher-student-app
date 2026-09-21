import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
    loginUser,
    registerUser,
} from "./auth.service.js";
import { getMe } from "./auth.controller.js";

const router = Router();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum([
        "ADMIN",
        "TEACHER",
        "STUDENT",
        "PARENT",
    ]),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

router.post("/register", async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);

        const user = await registerUser(
            data.email,
            data.password,
            data.role,
        );

        res.status(201).json({
            user,
        });
    } catch (error) {
        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Registration failed",
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);

        const result = await loginUser(
            data.email,
            data.password,
        );

        res.json(result);
    } catch (error) {
        res.status(401).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Login failed",
        });
    }
});

// Resolve the current account from the database rather than returning only the
// JWT payload. This keeps the frontend session in sync with the persisted user.
router.get("/me", authenticate, getMe);


export default router;
