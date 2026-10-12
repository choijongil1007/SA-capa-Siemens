// GET /api/admin/users   전체 사용자와 점수
import { json, error, requireAdmin, parseScores } from "../../../../lib/util.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return error("관리자 로그인이 필요합니다.", 401);
  const { results } = await env.DB.prepare(
    "SELECT id, name, scores, locked_until, created_at, updated_at FROM users ORDER BY name").all();
  return json({
    users: results.map(u => ({
      id: u.id,
      name: u.name,
      scores: parseScores(u.scores),
      locked: u.locked_until > Date.now(),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
  });
}
