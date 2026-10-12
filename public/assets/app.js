// 사용자 화면: 로그인 → 진단 → 리포트
(function () {
  const { api, analyze, gapClass, linkText, esc, drawRadar, renderReport } = window.Core;
  const TOKEN_KEY = "sa_token";
  const $ = id => document.getElementById(id);

  let token = null;
  let user = null;
  let radar = null;
  let saveTimer = null;

  function store(get, val) {
    try {
      if (get) return localStorage.getItem(TOKEN_KEY);
      if (val) localStorage.setItem(TOKEN_KEY, val); else localStorage.removeItem(TOKEN_KEY);
    } catch { /* 저장소 사용 불가: 세션 동안만 유지 */ }
    return null;
  }

  function show(view) {
    $("viewLogin").hidden = view !== "login";
    $("viewAssess").hidden = view !== "assess";
    $("userActions").hidden = view !== "assess";
    $("viewAdmin").hidden = view !== "admin";
    $("adminActions").hidden = view !== "admin";
  }

  // ── 관리자 (이름에 admin 입력) ─────────────
  const ADMIN_KEY = "sa_admin_token"; // admin.js 와 같은 키 (탭을 닫으면 사라짐)
  const isAdminName = n => n.trim().toLowerCase() === "admin";

  function adminToken(val) {
    try {
      if (val === undefined) return sessionStorage.getItem(ADMIN_KEY);
      if (val) sessionStorage.setItem(ADMIN_KEY, val); else sessionStorage.removeItem(ADMIN_KEY);
    } catch { /* 무시 */ }
    return null;
  }

  function syncLoginMode() {
    const admin = isAdminName($("inName").value);
    const pin = $("inPin");
    $("pinLabel").textContent = admin ? "관리자 비밀번호" : "비밀번호 (숫자 4자리)";
    pin.type = "password";
    if (admin) { pin.removeAttribute("maxlength"); pin.removeAttribute("pattern"); pin.inputMode = "text"; pin.placeholder = ""; }
    else { pin.maxLength = 4; pin.pattern = "\\d{4}"; pin.inputMode = "numeric"; pin.placeholder = "••••"; }
  }

  async function doAdminLogin(password) {
    $("loginMsg").textContent = "";
    $("btnLogin").disabled = true;
    try {
      const data = await api("/api/admin/login", { method: "POST", body: { password } });
      adminToken(data.token);
      $("inPin").value = "";
      show("admin");
    } catch (e) {
      $("loginMsg").textContent = e.message;
    } finally {
      $("btnLogin").disabled = false;
    }
  }

  function adminLogout() {
    adminToken(null);
    $("inName").value = ""; $("inPin").value = "";
    syncLoginMode();
    show("login");
  }

  // ── 로그인 ──────────────────────────────
  async function doLogin(register) {
    const name = $("inName").value.trim();
    const pin = $("inPin").value.trim();
    $("loginMsg").textContent = "";
    if (isAdminName(name)) return pin ? doAdminLogin($("inPin").value) : ($("loginMsg").textContent = "관리자 비밀번호를 입력해 주세요.");
    if (!name) return ($("loginMsg").textContent = "이름을 입력해 주세요.");
    if (!/^\d{4}$/.test(pin)) return ($("loginMsg").textContent = "비밀번호는 숫자 4자리입니다.");
    $("btnLogin").disabled = true;
    try {
      const data = await api("/api/login", { method: "POST", body: { name, pin, register } });
      if (data.needRegister) {
        $("regName").textContent = name;
        $("registerBox").hidden = false;
        $("btnLogin").hidden = true;
        return;
      }
      token = data.token;
      user = data.user;
      store(false, token);
      startAssess();
    } catch (e) {
      $("loginMsg").textContent = e.message;
    } finally {
      $("btnLogin").disabled = false;
    }
  }

  function resetRegister() {
    $("registerBox").hidden = true;
    $("btnLogin").hidden = false;
  }

  // ── 진단 ────────────────────────────────
  function startAssess() {
    $("whoName").textContent = user.name + " 님";
    $("saveState").textContent = "";
    show("assess");
    renderLevels();
    renderTable();
    renderDashboard();
  }

  function renderLevels() {
    $("levelList").innerHTML = window.LEVELS.map(l => `
      <div class="level"><span class="lv lv-${l.score}">${l.score}점 · ${esc(l.label)}</span><p>${esc(l.desc)}</p></div>`).join("");
  }

  function renderTable() {
    const st = analyze(user.scores);
    let html = "";
    window.AREAS.forEach(area => {
      area.items.forEach((it, idx) => {
        const row = st.items.find(x => x.id === it.id);
        const btns = window.LEVELS.map(l => `
          <button class="rate ${row.current === l.score ? "on" : ""}" data-id="${it.id}" data-v="${l.score}"
            title="${l.score}점 · ${esc(l.label)}">${l.score}</button>`).join("");
        html += `<tr>
          ${idx === 0 ? `<td class="area-cell" rowspan="${area.items.length}"><b>${esc(area.name)}</b><div class="muted small">중요도 ${area.weight}</div></td>` : ""}
          <td class="item-cell">${esc(it.name)}</td>
          <td class="c strong">${it.importance}</td>
          <td class="c"><div class="rates">${btns}</div></td>
          <td class="c"><span class="gap-chip ${gapClass(row.gap)}">${row.gap === null ? "-" : row.gap}</span></td>
        </tr>`;
      });
    });
    $("assessBody").innerHTML = html;
  }

  function renderDashboard() {
    const st = analyze(user.scores);
    $("progressPill").textContent = `진행률: ${st.rated} / ${st.total}`;
    $("kpiAvg").innerHTML = `${st.avgCurrent.toFixed(1)}<span>/ 5.0</span>`;
    $("kpiGap").innerHTML = `${Math.round(st.avgGap)}<span>점</span>`;

    if (radar) radar.destroy();
    radar = drawRadar($("radar"), st);

    const top = st.priorities.slice(0, 5);
    $("prioList").innerHTML = top.length ? `<ol class="prio">${top.map((it, i) => `
      <li class="prio-item">
        <div class="prio-head"><span class="prio-rank">${i + 1}</span><span class="prio-name">${esc(it.name)}</span>
          <span class="gap-chip ${gapClass(it.gap)}">Gap ${it.gap}</span></div>
        <div class="prio-meta">${esc(it.area.name)} · 중요도 ${it.importance} · 현재 ${it.current}점 · ${esc(linkText(it))}</div>
        <div class="prio-advice"><b>추천 실행 목표</b> ${esc(it.advice)}</div>
      </li>`).join("")}</ol>`
      : `<p class="muted empty">${st.rated ? "모든 항목이 중요도 수준에 도달했습니다." : "진단표에서 점수를 선택하면 우선순위가 나타납니다."}</p>`;
  }

  function setScore(id, v) {
    user.scores = { ...user.scores, [id]: v };
    renderTable();
    renderDashboard();
    $("saveState").textContent = "저장 중…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  async function save() {
    try {
      const r = await api("/api/me", { method: "PUT", token, body: { scores: user.scores } });
      user.updatedAt = r.updatedAt;
      $("saveState").textContent = "저장됨";
    } catch (e) {
      if (e.status === 401) return logout("세션이 만료되었습니다. 다시 로그인해 주세요.");
      $("saveState").textContent = "저장 실패 · 다시 시도해 주세요";
    }
  }

  async function logout(msg) {
    if (token) { try { await api("/api/me", { method: "DELETE", token }); } catch { /* 무시 */ } }
    token = null; user = null;
    store(false, null);
    $("inPin").value = "";
    resetRegister();
    show("login");
    $("loginMsg").textContent = typeof msg === "string" ? msg : "";
  }

  function printReport() {
    renderReport($("printArea"), user, { asImage: true });
    setTimeout(() => window.print(), 200);
  }

  // ── 이벤트 ──────────────────────────────
  document.addEventListener("DOMContentLoaded", async () => {
    $("appTitle").textContent = window.APP_TEXT.title;
    $("appSub").textContent = window.APP_TEXT.subtitle;
    document.title = window.APP_TEXT.title;

    $("loginForm").addEventListener("submit", e => { e.preventDefault(); doLogin(false); });
    $("btnRegister").addEventListener("click", () => doLogin(true));
    $("btnCancelReg").addEventListener("click", resetRegister);
    $("inName").addEventListener("input", () => { resetRegister(); syncLoginMode(); });
    $("btnAdminLogout").addEventListener("click", adminLogout);
    $("btnLogout").addEventListener("click", () => logout());
    $("btnPrint").addEventListener("click", printReport);
    $("assessBody").addEventListener("click", e => {
      const b = e.target.closest(".rate");
      if (b) setScore(b.dataset.id, Number(b.dataset.v));
    });

    const at = adminToken();
    if (at) {
      try { await api("/api/admin/users", { token: at }); return show("admin"); }
      catch { adminToken(null); }
    }

    token = store(true);
    if (token) {
      try {
        const data = await api("/api/me", { token });
        user = data.user;
        return startAssess();
      } catch { store(false, null); token = null; }
    }
    show("login");
  });
})();
