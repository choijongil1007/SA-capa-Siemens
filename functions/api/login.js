// POST /api/login  { name, pin, register? }
// - 등록된 이름: PIN 확인 후 세션 발급
// - 미등록 이름: register=true 이면 신규 등록, 아니면 needRegister 반환
import {
  json, error, readJson, normalizeName, isValidPin, randomHex, hashPin, safeEqual,
  createSession, parseScores, USER_TTL_MS, MAX_FAILS, LOCK_MS,
} from "../../lib/util.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const name = normalizeName(body.name);
  const pin = String(body.pin || "");

  if (!name || name.length > 30) return error("이름을 1~30자로 입력해 주세요.");
  if (name.toLowerCase() === "admin") return error("admin은 관리자 전용 이름입니다. 다른 이름을 사용해 주세요.");
  if (!isValidPin(pin)) return error("비밀번호는 숫자 4자리입니다.");

  const db = env.DB;
  const now = Date.now();
  const user = await db.prepare("SELECT * FROM users WHERE name = ?").bind(name).first();

  if (!user) {
    if (!body.register) return json({ needRegister: true });
    const salt = randomHex(16);
    const pinHash = await hashPin(pin, salt);
    const res = await db.prepare(
      "INSERT INTO users (name, pin_hash, pin_salt, scores, created_at, updated_at) VALUES (?, ?, ?, '{}', ?, ?)")
      .bind(name, pinHash, salt, now, now).run();
    const id = res.meta.last_row_id;
    const token = await createSession(db, "user", id, USER_TTL_MS);
    return json({ token, user: { id, name, scores: {}, updatedAt: now } });
  }

  if (user.locked_until > now) {
    const min = Math.ceil((user.locked_until - now) / 60000);
    return error(`비밀번호를 여러 번 틀려 잠겼습니다. ${min}분 후 다시 시도하거나 관리자에게 문의하세요.`, 429);
  }

  const pinHash = await hashPin(pin, user.pin_salt);
  if (!safeEqual(pinHash, user.pin_hash)) {
    const fails = user.failed_attempts + 1;
    const lockedUntil = fails >= MAX_FAILS ? now + LOCK_MS : 0;
    await db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?")
      .bind(fails >= MAX_FAILS ? 0 : fails, lockedUntil, user.id).run();
    return error(
      "이미 등록된 이름이고 비밀번호가 맞지 않습니다. 동명이인이라면 이름 뒤에 구분자를 붙여 주세요 (예: 홍길동A).",
      401);
  }

  await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?").bind(user.id).run();
  const token = await createSession(db, "user", user.id, USER_TTL_MS);
  return json({
    token,
    user: { id: user.id, name: user.name, scores: parseScores(user.scores), updatedAt: user.updated_at },
  });
}
