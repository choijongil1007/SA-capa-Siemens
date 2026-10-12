// 공통 유틸: 응답, 해시, 세션
export const USER_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7일
export const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;      // 12시간
export const MAX_FAILS = 5;
export const LOCK_MS = 10 * 60 * 1000;                // 10분

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

export function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ""));
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function hashPin(pin, saltHex) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return toHex(bits);
}

export async function sha256(text) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// 길이가 같은 두 hex 문자열을 일정 시간에 비교
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(db, role, userId, ttl) {
  const token = randomHex(32);
  const now = Date.now();
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
  await db.prepare("INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, role, now + ttl).run();
  return token;
}

export async function getSession(request, db) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const row = await db.prepare("SELECT token, user_id, role, expires_at FROM sessions WHERE token = ?")
    .bind(token).first();
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}

export async function requireAdmin(request, env) {
  const s = await getSession(request, env.DB);
  return s && s.role === "admin" ? s : null;
}

// public/assets/items.js 의 항목 id와 같아야 합니다.
export const VALID_ITEM_IDS = new Set(
  ["e", "c", "p", "u", "s"].flatMap(k => [1, 2, 3, 4].map(n => k + n)));

export function sanitizeScores(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input)) {
    const n = Number(v);
    if (VALID_ITEM_IDS.has(k) && Number.isInteger(n) && n >= 1 && n <= 5) out[k] = n;
  }
  return out;
}

export function parseScores(text) {
  try { const o = JSON.parse(text || "{}"); return o && typeof o === "object" ? o : {}; }
  catch { return {}; }
}
