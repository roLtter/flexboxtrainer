import express from "express";
import cors from "cors";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createUserRouter } from "./routes/userRoutes.js";
import { createTaskRouter } from "./routes/taskRoutes.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use("/api/auth", createAuthRouter());
  app.use("/api/users", createUserRouter());
  app.use("/api/tasks", createTaskRouter());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}
