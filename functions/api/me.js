// GET /api/me        내 정보와 점수
// PUT /api/me        { scores } 점수 저장
// DELETE /api/me     로그아웃(세션 삭제)
import { json, error, readJson, getSession, parseScores, sanitizeScores } from "../../lib/util.js";

async function currentUser(request, env) {
  const s = await getSession(request, env.DB);
  if (!s || s.role !== "user") return null;
  const user = await env.DB.prepare("SELECT id, name, scores, updated_at FROM users WHERE id = ?")
    .bind(s.user_id).first();
  return user ? { session: s, user } : null;
}

export async function onRequestGet({ request, env }) {
  const cu = await currentUser(request, env);
  if (!cu) return error("로그인이 필요합니다.", 401);
  const u = cu.user;
  return json({ user: { id: u.id, name: u.name, scores: parseScores(u.scores), updatedAt: u.updated_at } });
}

export async function onRequestPut({ request, env }) {
  const cu = await currentUser(request, env);
  if (!cu) return error("로그인이 필요합니다.", 401);
  const body = await readJson(request);
  const scores = sanitizeScores(body.scores);
  const now = Date.now();
  await env.DB.prepare("UPDATE users SET scores = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(scores), now, cu.user.id).run();
  return json({ ok: true, updatedAt: now });
}

export async function onRequestDelete({ request, env }) {
  const s = await getSession(request, env.DB);
  if (s) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(s.token).run();
  return json({ ok: true });
}
