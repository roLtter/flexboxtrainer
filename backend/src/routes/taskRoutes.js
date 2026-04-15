import { Router } from "express";
import { pool } from "../db.js";
import { generateTask } from "../generator.js";
import { requireAuth } from "../middleware/requireAuth.js";

export function createTaskRouter() {
  const router = Router();
  const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

  router.post("/generate", requireAuth, async (req, res) => {
    const maxContainerWidth = Number(req.body?.maxContainerWidth ?? 560);
    const maxContainerHeight = Number(req.body?.maxContainerHeight ?? 280);

    const safeWidth = Number.isFinite(maxContainerWidth) ? maxContainerWidth : 560;
    const safeHeight = Number.isFinite(maxContainerHeight) ? maxContainerHeight : 280;

    const task = generateTask(safeWidth, safeHeight);
    res.status(200).json({ task });
  });

  router.post("/attempts", requireAuth, async (req, res) => {
    const score = Number(req.body?.score);
    const code = String(req.body?.code ?? "");
    const modeRaw = String(req.body?.mode ?? "html").toLowerCase();
    const editorMode = modeRaw === "tsx" ? "tsx" : "html";
    const task = req.body?.task;

    if (!Number.isFinite(score) || !code || !task || typeof task !== "object") {
      res.status(400).json({ error: "Invalid attempt payload" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertedTask = await client.query(
        `INSERT INTO tasks(created_by, task_config) VALUES ($1, $2::jsonb) RETURNING id`,
        [req.user.id, JSON.stringify(task)],
      );
      const taskId = Number(insertedTask.rows[0].id);
      await client.query(
        `INSERT INTO attempts(user_id, task_id, score, code, editor_mode) VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, taskId, clampScore(score), code, editorMode],
      );
      await client.query("COMMIT");
      res.status(201).json({ ok: true, taskId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  router.post("/:id/attempts", requireAuth, async (req, res) => {
    const taskId = Number(req.params.id);
    const score = Number(req.body?.score);
    const code = String(req.body?.code ?? "");
    const modeRaw = String(req.body?.mode ?? "html").toLowerCase();
    const editorMode = modeRaw === "tsx" ? "tsx" : "html";

    if (!Number.isInteger(taskId) || !Number.isFinite(score) || !code) {
      res.status(400).json({ error: "Invalid attempt payload" });
      return;
    }

    const nextScore = clampScore(score);
    await pool.query(
      `
        INSERT INTO attempts(user_id, task_id, score, code, editor_mode, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, task_id)
        DO UPDATE SET
          score = EXCLUDED.score,
          code = EXCLUDED.code,
          editor_mode = EXCLUDED.editor_mode,
          created_at = NOW()
      `,
      [req.user.id, taskId, nextScore, code, editorMode],
    );
    res.status(201).json({ ok: true });
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }
    const result = await pool.query(`SELECT id, task_config, created_at FROM tasks WHERE id = $1 LIMIT 1`, [taskId]);
    const task = result.rows[0];
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(200).json({ taskId: task.id, task: task.task_config, createdAt: task.created_at });
  });

  return router;
}
