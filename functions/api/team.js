// GET /api/team  로그인한 사용자(또는 관리자)에게 이름 없는 팀 집계만 반환
import { json, error, getSession } from "../../lib/util.js";
import { aggregate } from "../../lib/team.js";

export async function onRequestGet({ request, env }) {
  const s = await getSession(request, env.DB);
  if (!s) return error("로그인이 필요합니다.", 401);
  const { results } = await env.DB.prepare("SELECT scores FROM users").all();
  return json(aggregate(results));
}
