import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { fetchAggregateStats, fetchDailyActivity, fetchHeatmap } from "../services/userStats.js";

export function createUserRouter() {
  const router = Router();

  router.patch("/:id/profile", requireAuth, async (req, res) => {
    const requestedUserId = Number(req.params.id);
    if (requestedUserId !== Number(req.user.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const nicknameRaw = String(req.body?.nickname ?? "").trim();
    const nickname = nicknameRaw.length > 0 ? nicknameRaw.slice(0, 40) : null;

    let countryCode = null;
    if (req.body?.country_code === null || req.body?.country_code === "") {
      countryCode = null;
    } else if (req.body?.country_code != null) {
      const cc = String(req.body.country_code).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(cc)) countryCode = cc;
    }

    const workplaceRaw = String(req.body?.workplace ?? "").trim();
    const workplace = workplaceRaw.length > 0 ? workplaceRaw.slice(0, 80) : null;

    const av = Number(req.body?.avatar_variant);
    const avatarVariant = Number.isFinite(av) ? Math.max(0, Math.min(31, Math.round(av))) : 0;
    let avatarImageData = null;
    if (req.body?.avatar_image_data === null || req.body?.avatar_image_data === "") {
      avatarImageData = null;
    } else if (typeof req.body?.avatar_image_data === "string") {
      const raw = req.body.avatar_image_data.trim();
      if (/^data:image\/(png|jpeg);base64,/i.test(raw) && raw.length <= 1_500_000) {
        avatarImageData = raw;
      }
    }

    const updated = await pool.query(
      `UPDATE users SET nickname = $1, country_code = $2, workplace = $3, avatar_variant = $4, avatar_image_data = $5
       WHERE id = $6
       RETURNING id, email, nickname, country_code, workplace, avatar_variant, avatar_image_data`,
      [nickname, countryCode, workplace, avatarVariant, avatarImageData, requestedUserId],
    );
    res.status(200).json({ user: updated.rows[0] });
  });

  router.get("/:id/history", requireAuth, async (req, res) => {
    const requestedUserId = Number(req.params.id);
    if (requestedUserId !== Number(req.user.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const result = await pool.query(
      `
        WITH ranked AS (
          SELECT
            a.user_id,
            a.task_id,
            a.score,
            a.code,
            a.editor_mode,
            a.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY a.task_id
              ORDER BY a.score DESC, a.created_at DESC
            ) AS best_rank,
            ROW_NUMBER() OVER (
              PARTITION BY a.task_id
              ORDER BY a.created_at DESC
            ) AS last_rank
          FROM attempts a
          WHERE a.user_id = $1
        )
        SELECT
          best.task_id,
          best.score AS best_score,
          last_try.code AS last_code,
          last_try.editor_mode AS last_editor_mode,
          last_try.created_at AS last_attempt_at,
          t.task_config
        FROM ranked best
        JOIN ranked last_try
          ON best.task_id = last_try.task_id
         AND last_try.last_rank = 1
        JOIN tasks t ON t.id = best.task_id
        WHERE best.best_rank = 1
        ORDER BY last_try.created_at DESC
        LIMIT 200
      `,
      [requestedUserId],
    );

    res.status(200).json({ items: result.rows });
  });

  router.get("/:id/stats", requireAuth, async (req, res) => {
    const requestedUserId = Number(req.params.id);
    if (requestedUserId !== Number(req.user.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const activity = String(req.query.activity ?? "week");

    const [stats, heatmap] = await Promise.all([
      fetchAggregateStats(pool, requestedUserId),
      fetchHeatmap(pool, requestedUserId),
    ]);
    const daily = await fetchDailyActivity(pool, requestedUserId, activity);

    res.status(200).json({ stats: stats.rows[0], daily: daily.rows, heatmap: heatmap.rows });
  });

  return router;
}
