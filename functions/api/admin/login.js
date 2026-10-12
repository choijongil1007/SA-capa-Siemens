// POST /api/admin/login  { password }
import { json, error, readJson, sha256, safeEqual, createSession, ADMIN_TTL_MS } from "../../../lib/util.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return error("관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다.", 500);
  const body = await readJson(request);
  const ok = safeEqual(await sha256(String(body.password || "")), await sha256(env.ADMIN_PASSWORD));
  if (!ok) {
    await new Promise(r => setTimeout(r, 800)); // 무차별 대입 지연
    return error("관리자 비밀번호가 맞지 않습니다.", 401);
  }
  const token = await createSession(env.DB, "admin", null, ADMIN_TTL_MS);
  return json({ token });
}
