// DELETE /api/admin/users/:id          사용자 삭제
// PATCH  /api/admin/users/:id { pin }  비밀번호 재설정(잠금 해제 포함)
import { json, error, readJson, requireAdmin, isValidPin, randomHex, hashPin } from "../../../../lib/util.js";

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return error("관리자 로그인이 필요합니다.", 401);
  const id = Number(params.id);
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

export async function onRequestPatch({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return error("관리자 로그인이 필요합니다.", 401);
  const body = await readJson(request);
  const pin = String(body.pin || "");
  if (!isValidPin(pin)) return error("비밀번호는 숫자 4자리입니다.");
  const id = Number(params.id);
  const salt = randomHex(16);
  const pinHash = await hashPin(pin, salt);
  await env.DB.prepare(
    "UPDATE users SET pin_hash = ?, pin_salt = ?, failed_attempts = 0, locked_until = 0 WHERE id = ?")
    .bind(pinHash, salt, id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  return json({ ok: true });
}
