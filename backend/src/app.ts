import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import adminUserRoutes from "./modules/admin/users.routes.js";
import adminDashboardRoutes from "./modules/admin/dashboard.routes.js";
import classRoutes from "./modules/classes/classes.routes.js";
import { studentRouter, teacherRouter } from "./modules/academic/academic.routes.js";
import subjectRoutes from "./modules/subjects/subjects.routes.js";
import studentAssignmentRoutes from "./routes/studentAssignment.routes.js";
import classEnrollmentRoutes from "./routes/classEnrollment.routes.js";
import parentRoutes from "./modules/parent/parent.routes.js";
import adminParentLinkRoutes from "./modules/admin/parentLinks.routes.js";
import announcementRoutes from "./modules/announcements/announcements.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import { errorHandler, notFoundHandler, requestContext } from "./middleware/request.middleware.js";
import { loadConfig } from "./config.js";
import { pool } from "./db/index.js";

export function createApp() {
    const config = loadConfig();
    const app = express();
    app.disable("x-powered-by");
    app.set("etag", false);
    app.use(requestContext);
    app.use(cors({
        origin(origin, callback) {
            if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 600,
    }));
    app.use(express.json({ limit: "1mb" }));

    app.get("/api/health", async (_req, res) => {
        try {
            await pool.query("select 1");
            return res.json({ status: "ok", checks: { database: "ok" } });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Database health check failed";
            console.error(JSON.stringify({ level: "error", event: "database_health_check_failed", requestId: res.getHeader("X-Request-Id"), message }));
            return res.status(503).json({ status: "error", checks: { database: "unavailable" }, message: "Database is unavailable", requestId: res.getHeader("X-Request-Id") });
        }
    });
    app.use("/api/auth", authRoutes);
    app.use("/api/admin/users", adminUserRoutes);
    app.use("/api/admin/dashboard", adminDashboardRoutes);
    app.use("/api/admin/parent-links", adminParentLinkRoutes);
    app.use("/api/announcements", announcementRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/reports", reportsRoutes);
    app.use("/api/classes", classRoutes);
    app.use("/api/subjects", subjectRoutes);
    app.use("/api/teacher", teacherRouter);
    app.use("/api/student", studentRouter);
    app.use("/api/student", studentAssignmentRoutes);
    app.use("/api/parent", parentRoutes);
    app.use("/api/class-enrollments", classEnrollmentRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

