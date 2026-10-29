import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import adminUserRoutes from "./modules/admin/users.routes.js";
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
const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }),
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "Teacher Student API is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUserRoutes);
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
app.use(
  "/api/class-enrollments",
  classEnrollmentRoutes
);

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});

