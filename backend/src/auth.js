import crypto from "crypto";
import { pool } from "./db.js";

const COOKIE_NAME = "csstrainer_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function parseCookies(header) {
  if (!header) return {};
  return header.split(";").reduce((acc, chunk) => {
    const [k, ...rest] = chunk.trim().split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(computed, "hex"));
}

function buildSessionCookie(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
  return { token, cookie: buildSessionCookie(token) };
}

export async function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const { rows } = await pool.query(
    `
      SELECT u.id, u.email
           , u.nickname
           , u.country_code
           , u.workplace
           , u.avatar_variant
           , u.avatar_image_data
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function deleteSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}
