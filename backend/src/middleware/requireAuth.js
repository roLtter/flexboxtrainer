import { getUserFromRequest } from "../auth.js";

export async function requireAuth(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}
