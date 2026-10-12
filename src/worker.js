// Workers 진입점: /api/* 를 기존 handler 모듈로 연결합니다. (정적 파일은 assets가 먼저 처리)
import * as login from "../functions/api/login.js";
import * as team from "../functions/api/team.js";
import * as me from "../functions/api/me.js";
import * as adminLogin from "../functions/api/admin/login.js";
import * as adminUsers from "../functions/api/admin/users/index.js";
import * as adminUser from "../functions/api/admin/users/[id].js";

const METHODS = { GET: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", PATCH: "onRequestPatch", DELETE: "onRequestDelete" };

function route(pathname) {
  if (pathname === "/api/login") return [login, {}];
  if (pathname === "/api/team") return [team, {}];
  if (pathname === "/api/me") return [me, {}];
  if (pathname === "/api/admin/login") return [adminLogin, {}];
  if (pathname === "/api/admin/users") return [adminUsers, {}];
  const m = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (m) return [adminUser, { id: m[1] }];
  return null;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const hit = route(pathname.replace(/\/+$/, "") || "/");
    const json = (data, status) => new Response(JSON.stringify(data), {
      status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    if (!hit) return json({ error: "Not found" }, 404);
    const handler = hit[0][METHODS[request.method]];
    if (!handler) return json({ error: "Method not allowed" }, 405);
    try {
      return await handler({ request, env, params: hit[1] });
    } catch (e) {
      console.error(e);
      return json({ error: "서버 오류가 발생했습니다." }, 500);
    }
  },
};
