// 어드민 화면: 팀 히트맵, 팀 학습 우선순위, 참여자 관리, 전체 리포트 PDF
(function () {
  const { api, analyze, gapOf, gapClass, linkText, esc, fmtDate, renderReport, ALL_ITEMS, TOTAL } = window.Core;
  const TOKEN_KEY = "sa_admin_token";
  const $ = id => document.getElementById(id);

  let token = null;
  let users = [];
  let mode = "gap";
  let reportChart = null;

  function store(get, val) {
    try {
      if (get) return sessionStorage.getItem(TOKEN_KEY);
      if (val) sessionStorage.setItem(TOKEN_KEY, val); else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* 무시 */ }
    return null;
  }

  function show(view) {
    $("viewLogin").hidden = view !== "login";
    $("viewDash").hidden = view !== "dash";
    $("adminActions").hidden = view !== "dash";
  }

  const short = it => it.short || it.name;

  // ── 집계 ────────────────────────────────
  function teamStats() {
    const per = users.map(u => ({ user: u, st: analyze(u.scores) }));
    const items = ALL_ITEMS.map(it => {
      const vals = per.map(p => Number(p.user.scores[it.id]) || 0).filter(v => v > 0);
      const dist = [1, 2, 3, 4, 5].map(s => vals.filter(v => v === s).length);
      const avgCur = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const gaps = vals.map(v => gapOf(it.importance, v));
      const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
      const mentors = per.filter(p => (Number(p.user.scores[it.id]) || 0) >= 4).map(p => p.user.name);
      const highGapPeople = gaps.filter(g => g >= 50).length;
      return { ...it, n: vals.length, dist, avgCur, avgGap, mentors, highGapPeople, method: method(avgGap, mentors.length, highGapPeople) };
    });
    const started = per.filter(p => p.st.rated > 0);
    return {
      per, items,
      done: per.filter(p => p.st.rated === TOTAL).length,
      avgCur: started.length ? started.reduce((s, p) => s + p.st.avgCurrent, 0) / started.length : 0,
      avgGap: started.length ? started.reduce((s, p) => s + p.st.avgGap, 0) / started.length : 0,
    };
  }

  function method(avgGap, mentorCount, highGapPeople) {
    if (avgGap === null) return { label: "-", cls: "" };
    if (avgGap >= 50 && mentorCount === 0) return { label: "팀 교육", cls: "warn" };
    if (avgGap >= 25 && mentorCount > 0) return { label: "사내 멘토링", cls: "" };
    if (avgGap >= 25) return { label: "팀 교육", cls: "warn" };
    if (highGapPeople > 0) return { label: "개인 코칭", cls: "" };
    return { label: "유지", cls: "" };
  }

  // ── 렌더링 ──────────────────────────────
  function render() {
    const ts = teamStats();
    $("teamKpis").innerHTML = `
      <div><div class="kpi-l">참여자</div><div class="kpi-v">${users.length}<span>명</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">진단 완료</div><div class="kpi-v green">${ts.done}<span>명</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">팀 평균 역량</div><div class="kpi-v green">${ts.avgCur.toFixed(1)}<span>/ 5.0</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">팀 평균 Gap</div><div class="kpi-v amber">${Math.round(ts.avgGap)}<span>점</span></div></div>`;
    renderLegend();
    $("heatWrap").innerHTML = heatmapHtml(ts, mode);
    $("teamPrio").innerHTML = teamPrioHtml(ts, 20);
    renderUsers(ts);
  }

  function renderLegend() {
    $("legend").innerHTML = mode === "gap"
      ? `<span class="gap-chip g-0">0</span><span class="gap-chip g-25">25</span><span class="gap-chip g-50">50</span><span class="gap-chip g-75">75+</span><span class="gap-chip g-none">미응답</span>`
      : `<span class="gap-chip c-1">1</span><span class="gap-chip c-2">2</span><span class="gap-chip c-3">3</span><span class="gap-chip c-4">4</span><span class="gap-chip c-5">5</span><span class="gap-chip g-none">미응답</span>`;
  }

  function cell(it, v) {
    if (!v) return `<td class="g-none" title="${esc(it.name)}">-</td>`;
    if (mode === "gap") {
      const g = gapOf(it.importance, v);
      return `<td class="${gapClass(g)}" title="${esc(it.name)} · 현재 ${v}점">${g}</td>`;
    }
    return `<td class="c-${v}" title="${esc(it.name)} · Gap ${gapOf(it.importance, v)}">${v}</td>`;
  }

  function heatmapHtml(ts, m) {
    if (!users.length) return `<p class="muted empty">아직 참여자가 없습니다.</p>`;
    const prev = mode; mode = m;
    const head1 = window.AREAS.map(a => `<th class="area-h" colspan="${a.items.length}">${esc(a.name)}</th>`).join("");
    const head2 = ALL_ITEMS.map(it => `<th class="item-h" title="${esc(it.name)}">${esc(short(it))}</th>`).join("");
    const rows = ts.per.map(p => `
      <tr><td class="name">${esc(p.user.name)}</td>
        ${ALL_ITEMS.map(it => cell(it, Number(p.user.scores[it.id]) || 0)).join("")}
        <td class="sum">${p.st.rated ? (m === "gap" ? Math.round(p.st.avgGap) : p.st.avgCurrent.toFixed(1)) : "-"}</td></tr>`).join("");
    const avgRow = `<tr class="avg"><td class="name">팀 평균</td>
      ${ts.items.map(it => {
        if (!it.n) return `<td class="g-none">-</td>`;
        if (m === "gap") { const g = Math.round(it.avgGap); return `<td class="${gapClass(g)}">${g}</td>`; }
        return `<td class="c-${Math.max(1, Math.round(it.avgCur))}">${it.avgCur.toFixed(1)}</td>`;
      }).join("")}
      <td class="sum">${m === "gap" ? Math.round(ts.avgGap) : ts.avgCur.toFixed(1)}</td></tr>`;
    mode = prev;
    return `<table class="heat">
      <thead><tr><th></th>${head1}<th></th></tr><tr><th></th>${head2}<th class="item-h">${m === "gap" ? "평균 Gap" : "평균 점수"}</th></tr></thead>
      <tbody>${rows}${avgRow}</tbody></table>`;
  }

  function teamPrioHtml(ts, limit) {
    const list = ts.items.filter(i => i.n).sort((a, b) => b.avgGap - a.avgGap || b.importance - a.importance).slice(0, limit);
    if (!list.length) return `<tbody><tr><td class="muted">진단 결과가 쌓이면 표시됩니다.</td></tr></tbody>`;
    const linkHead = window.EDITION === "siemens" ? "영향받는 SVS 단계" : "연결 교재";
    return `<thead><tr><th>#</th><th>진단 항목</th><th>역량</th><th class="c">중요도</th><th class="c nowrap">팀 평균</th><th class="c nowrap">평균 Gap</th><th class="c nowrap dist-col">분포 (1→5점)</th><th>멘토 후보 (4~5점)</th><th class="c">권장 방식</th><th>${linkHead}</th></tr></thead>
      <tbody>${list.map((it, i) => {
        const max = Math.max(1, ...it.dist);
        return `<tr>
          <td class="c">${i + 1}</td>
          <td class="item-col">${esc(it.name)}</td>
          <td class="nowrap">${esc(it.area.name)}</td>
          <td class="c">${it.importance}</td>
          <td class="c">${it.avgCur.toFixed(1)}</td>
          <td class="c"><span class="gap-chip ${gapClass(Math.round(it.avgGap))}">${Math.round(it.avgGap)}</span></td>
          <td class="c dist-col"><span class="dist" title="${it.dist.map((d, k) => `${k + 1}점 ${d}명`).join(", ")}">${it.dist.map(d => `<i style="height:${Math.max(2, (d / max) * 26)}px"></i>`).join("")}</span></td>
          <td class="mentor">${it.mentors.length ? it.mentors.map(n => `<span class="tag">${esc(n)}</span>`).join("") : '<span class="muted">없음</span>'}</td>
          <td class="c"><span class="tag ${it.method.cls}">${it.method.label}</span></td>
          <td class="small">${esc(window.EDITION === "siemens" ? it.svs : it.base)}</td>
        </tr>`;
      }).join("")}</tbody>`;
  }

  function renderUsers(ts) {
    $("userCount").textContent = `${users.length}명`;
    if (!users.length) { $("userTable").innerHTML = `<tbody><tr><td class="muted">아직 참여자가 없습니다.</td></tr></tbody>`; return; }
    $("userTable").innerHTML = `
      <thead><tr><th>이름</th><th>진행률</th><th class="c">평균 역량</th><th class="c">평균 Gap</th><th>최우선 학습 항목</th><th>최종 저장</th><th class="c">관리</th></tr></thead>
      <tbody>${ts.per.map(p => {
        const top = p.st.priorities[0];
        return `<tr>
          <td><b>${esc(p.user.name)}</b> ${p.user.locked ? '<span class="tag warn">잠김</span>' : ""}</td>
          <td><span class="bar"><i style="width:${(p.st.rated / TOTAL) * 100}%"></i></span> <span class="small muted">${p.st.rated}/${TOTAL}</span></td>
          <td class="c">${p.st.rated ? p.st.avgCurrent.toFixed(1) : "-"}</td>
          <td class="c">${p.st.rated ? `<span class="gap-chip ${gapClass(Math.round(p.st.avgGap))}">${Math.round(p.st.avgGap)}</span>` : "-"}</td>
          <td class="small">${top ? esc(top.name) + ` <span class="muted">(Gap ${top.gap})</span>` : '<span class="muted">-</span>'}</td>
          <td class="small muted">${fmtDate(p.user.updatedAt)}</td>
          <td class="c"><div class="row-gap" style="justify-content:center">
            <button class="btn btn-ghost btn-sm" data-act="view" data-id="${p.user.id}">리포트</button>
            <button class="btn btn-ghost btn-sm" data-act="pin" data-id="${p.user.id}">비밀번호 재설정</button>
            <button class="btn btn-danger btn-sm" data-act="del" data-id="${p.user.id}">삭제</button>
          </div></td></tr>`;
      }).join("")}</tbody>`;
  }

  // ── 동작 ────────────────────────────────
  async function load() {
    try {
      const data = await api("/api/admin/users", { token });
      users = data.users;
      show("dash");
      render();
    } catch (e) {
      if (e.status === 401) return logout("다시 로그인해 주세요.");
      alert(e.message);
    }
  }

  function viewUser(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (reportChart) reportChart.destroy();
    $("userReportCard").hidden = false;
    reportChart = renderReport($("userReport"), u);
    $("userReportCard").scrollIntoView({ behavior: "smooth" });
  }

  async function resetPin(id) {
    const u = users.find(x => x.id === id);
    const pin = prompt(`${u.name} 님의 새 비밀번호(숫자 4자리)를 입력하세요.\n잠김도 함께 해제됩니다.`);
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin)) return alert("숫자 4자리를 입력해 주세요.");
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", token, body: { pin } });
      alert(`${u.name} 님의 비밀번호를 재설정했습니다.`);
      load();
    } catch (e) { alert(e.message); }
  }

  async function removeUser(id) {
    const u = users.find(x => x.id === id);
    if (!confirm(`${u.name} 님의 진단 결과를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE", token });
      $("userReportCard").hidden = true;
      load();
    } catch (e) { alert(e.message); }
  }

  function printAll() {
    if (!users.length) return alert("출력할 참여자가 없습니다.");
    const ts = teamStats();
    const area = $("printArea");
    const today = fmtDate(Date.now()).slice(0, 10);
    const pages = [`
      <section class="page report">
        <div class="report-head">
          <div><div class="report-kicker">${esc(window.APP_TEXT.title)}</div><h2 class="report-name">팀 역량 요약</h2>
            <div class="muted small">출력일 ${today} · 참여자 ${users.length}명 · 진단 완료 ${ts.done}명</div></div>
          <div class="kpis">
            <div class="kpi"><div class="kpi-l">팀 평균 역량</div><div class="kpi-v">${ts.avgCur.toFixed(1)}<span>/ 5.0</span></div></div>
            <div class="kpi"><div class="kpi-l">팀 평균 Gap</div><div class="kpi-v">${Math.round(ts.avgGap)}<span>점</span></div></div>
          </div>
        </div>
        <div class="card pad"><h3 class="card-title">팀 히트맵 · Gap</h3><div class="heat-print">${heatmapHtml(ts, "gap")}</div></div>
      </section>`, `
      <section class="page report">
        <div class="card pad"><h3 class="card-title">팀 학습 우선순위 Top 10</h3><table class="tbl">${teamPrioHtml(ts, 10)}</table></div>
      </section>`];
    users.forEach((u, i) => pages.push(`<section class="page" data-u="${i}"></section>`));
    area.innerHTML = pages.join("");
    users.forEach((u, i) => renderReport(area.querySelector(`[data-u="${i}"]`), u, { asImage: true }));
    setTimeout(() => window.print(), 300);
  }

  async function logout(msg) {
    store(false, null);
    token = null; users = [];
    show("login");
    $("loginMsg").textContent = typeof msg === "string" ? msg : "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("appTitle").textContent = window.APP_TEXT.title;
    $("loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      $("loginMsg").textContent = "";
      $("btnLogin").disabled = true;
      try {
        const data = await api("/api/admin/login", { method: "POST", body: { password: $("inPw").value } });
        token = data.token;
        store(false, token);
        $("inPw").value = "";
        load();
      } catch (err) { $("loginMsg").textContent = err.message; }
      finally { $("btnLogin").disabled = false; }
    });
    $("btnRefresh").addEventListener("click", load);
    $("btnPrintAll").addEventListener("click", printAll);
    $("btnLogout").addEventListener("click", () => logout());
    $("btnCloseReport").addEventListener("click", () => { $("userReportCard").hidden = true; });
    $("modeSeg").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      mode = b.dataset.mode;
      [...$("modeSeg").children].forEach(x => x.classList.toggle("on", x === b));
      render();
    });
    $("userTable").addEventListener("click", e => {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const id = Number(b.dataset.id);
      if (b.dataset.act === "view") viewUser(id);
      if (b.dataset.act === "pin") resetPin(id);
      if (b.dataset.act === "del") removeUser(id);
    });

    token = store(true);
    if (token) load(); else show("login");
  });
})();
