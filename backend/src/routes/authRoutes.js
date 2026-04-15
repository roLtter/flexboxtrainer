import { Router } from "express";
import { pool } from "../db.js";
import {
  clearSessionCookie,
  createSession,
  deleteSessionFromRequest,
  getUserFromRequest,
  hashPassword,
  verifyPassword,
} from "../auth.js";

export function createAuthRouter() {
  const router = Router();

  router.post("/register", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const nicknameRaw = String(req.body?.nickname ?? "").trim();
    const nickname = nicknameRaw.length > 0 ? nicknameRaw.slice(0, 40) : null;

    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: "Email and password (min 6 chars) are required" });
      return;
    }

    try {
      const passwordHash = hashPassword(password);
      const created = await pool.query(
        `INSERT INTO users(email, password_hash, nickname, country_code, workplace, avatar_variant, avatar_image_data)
         VALUES ($1, $2, $3, NULL, NULL, 0, NULL)
         RETURNING id, email, nickname, country_code, workplace, avatar_variant, avatar_image_data`,
        [email, passwordHash, nickname],
      );
      const user = created.rows[0];
      const session = await createSession(user.id);
      res.setHeader("Set-Cookie", session.cookie);
      res.status(201).json({ user });
    } catch (error) {
      if (error?.code === "23505") {
        res.status(409).json({ error: "Email already registered" });
        return;
      }
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  router.post("/login", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const found = await pool.query(
      `SELECT id, email, nickname, country_code, workplace, avatar_variant, avatar_image_data, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const user = found.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const session = await createSession(user.id);
    res.setHeader("Set-Cookie", session.cookie);
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        country_code: user.country_code,
        workplace: user.workplace,
        avatar_variant: Number(user.avatar_variant ?? 0),
        avatar_image_data: user.avatar_image_data,
      },
    });
  });

  router.post("/logout", async (req, res) => {
    await deleteSessionFromRequest(req);
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(200).json({ ok: true });
  });

  router.get("/me", async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.status(200).json({ user });
  });

  return router;
}
