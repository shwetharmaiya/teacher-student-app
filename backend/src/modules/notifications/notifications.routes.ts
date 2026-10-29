import { Router } from "express";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { db } from "../../db/index.js";
import { notifications } from "../../db/schema.js";

const router = Router();
const listSchema = z.object({
    unreadOnly: z.enum(["true", "false"]).default("false"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid notification filters" });
    const filters = [eq(notifications.userId, req.user!.userId)];
    if (parsed.data.unreadOnly === "true") filters.push(isNull(notifications.readAt));
    try {
        const where = and(...filters);
        const [unreadResult] = await db.select({ total: count() }).from(notifications)
            .where(and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt)));
        const items = await db.select().from(notifications).where(where)
            .orderBy(desc(notifications.createdAt)).limit(parsed.data.limit)
            .offset((parsed.data.page - 1) * parsed.data.limit);
        const [totalResult] = await db.select({ total: count() }).from(notifications).where(where);
        return res.json({ notifications: items, unreadCount: unreadResult?.total ?? 0, total: totalResult?.total ?? 0, page: parsed.data.page, limit: parsed.data.limit });
    } catch (error) {
        console.error("List notifications error:", error);
        return res.status(500).json({ message: "Could not load notifications" });
    }
});

router.put("/read-all", async (req: AuthenticatedRequest, res) => {
    try {
        const result = await db.update(notifications).set({ readAt: new Date() })
            .where(and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt)))
            .returning({ id: notifications.id });
        return res.json({ markedRead: result.length });
    } catch (error) {
        console.error("Mark notifications read error:", error);
        return res.status(500).json({ message: "Could not update notifications" });
    }
});

router.put("/:id/read", async (req: AuthenticatedRequest, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ message: "Invalid notification ID" });
    try {
        const [updated] = await db.update(notifications).set({ readAt: new Date() })
            .where(and(eq(notifications.id, id.data), eq(notifications.userId, req.user!.userId)))
            .returning({ id: notifications.id, readAt: notifications.readAt });
        if (!updated) return res.status(404).json({ message: "Notification not found" });
        return res.json({ notification: updated });
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).json({ message: "Could not update notification" });
    }
});

export default router;
