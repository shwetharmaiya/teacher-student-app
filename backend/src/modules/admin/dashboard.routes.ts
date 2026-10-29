import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { getAdminDashboardSummary } from "./dashboard.service.js";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN"));
router.get("/", async (_req, res) => {
    try {
        return res.json(await getAdminDashboardSummary());
    } catch (error) {
        console.error("Load admin dashboard error:", error);
        return res.status(500).json({ message: "Could not load dashboard summary" });
    }
});

export default router;
