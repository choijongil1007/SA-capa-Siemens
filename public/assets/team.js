// 팀 통계 화면: 서버가 집계한 값(이름·개인 점수 없음)만 사용합니다.
(function () {
  const { api, esc, gapClass, recommend, teamArea, ALL_ITEMS } = window.Core;
  const $ = id => document.getElementById(id);

  // 사용자 또는 관리자 로그인 토큰을 찾습니다.
  function findToken() {
    try {
      const a = sessionStorage.getItem("sa_admin_token");
      if (a) return { token: a, admin: true };
      const u = localStorage.getItem("sa_token");
      if (u) return { token: u, admin: false };
    } catch { /* 저장소 사용 불가 */ }
    return null;
  }

  function mentorText(n) { return n > 0 ? `${n}명` : '<span class="muted">없음</span>'; }

  function renderKpis(t) {
    $("teamKpis").innerHTML = `
      <div><div class="kpi-l">참여자</div><div class="kpi-v">${t.participants}<span>명</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">진단 완료</div><div class="kpi-v green">${t.completed ?? "-"}<span>${t.ready ? "명" : ""}</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">팀 평균 역량</div><div class="kpi-v green">${t.ready ? t.avgCur.toFixed(1) : "-"}<span>/ 5.0</span></div></div>
      <div class="vline"></div>
      <div><div class="kpi-l">팀 평균 Gap</div><div class="kpi-v amber">${t.ready ? Math.round(t.avgGap) : "-"}<span>점</span></div></div>`;
  }

  function renderRadar(t, mine) {
    const areas = window.AREAS;
    new Chart($("radar").getContext("2d"), {
      type: "radar",
      data: {
        labels: areas.map(a => a.name),
        datasets: [
          { label: "중요도", data: areas.map(a => a.weight), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)",
            borderDash: [4, 4], pointBackgroundColor: "#6366f1", borderWidth: 1.5 },
          { label: "팀 평균", data: areas.map(a => { const x = teamArea(t, a.id); return x ? +x.avgCur.toFixed(2) : null; }),
            borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.2)", pointBackgroundColor: "#d97706", borderWidth: 2 },
          ...(mine ? [{ label: "내 점수", data: areas.map(a => {
              const v = a.items.map(i => mine[i.id]).filter(Boolean);
              return v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2) : null;
            }),
            borderColor: "#059669", backgroundColor: "rgba(16,185,129,0.15)", pointBackgroundColor: "#059669", borderWidth: 2 }] : []),
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 10 }, backdropColor: "transparent" },
          pointLabels: { font: { size: 11, weight: "600" } } } },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });
  }

  const pos = v => `${((v - 1) / 4) * 100}%`;

  // 1~5점 눈금 위에 목표(눈금), 팀 평균(주황), 내 점수(초록)를 한 줄로 보여줍니다.
  function track(target, team, mine) {
    return `<div class="cmp-track" aria-hidden="true">
      <i class="tick" style="left:${pos(target)}"></i>
      <i class="dot team" style="left:${pos(team)}"></i>
      ${mine ? `<i class="dot me" style="left:${pos(mine)}"></i>` : ""}</div>`;
  }

  function renderTable(t, mine, sortKey) {
    const gapMine = (it) => mine && mine[it.id] ? Math.max(0, (it.importance - mine[it.id]) * 25) : -1;
    const rows = ALL_ITEMS.map(it => ({ it, s: t.items[it.id] })).filter(r => r.s && !r.s.hidden)
      .sort((a, b) => sortKey === "mine"
        ? gapMine(b.it) - gapMine(a.it) || b.s.avgGap - a.s.avgGap
        : b.s.avgGap - a.s.avgGap || b.it.importance - a.it.importance);
    const linkHead = window.EDITION === "siemens" ? "영향받는 SVS 단계" : "연결 교재";
    $("teamPrio").innerHTML = `
      <thead><tr><th>진단 항목</th><th class="cmp-col">점수 비교</th><th class="c nowrap">팀 Gap</th>${mine ? '<th class="c nowrap">내 Gap</th>' : ""}<th class="c">멘토 후보 (4~5점)</th><th class="c">권장 방식</th><th>${linkHead}</th></tr></thead>
      <tbody>${rows.map(({ it, s }, i) => {
        const m = recommend(s.avgGap, s.mentors, s.highGapPeople);
        const tip = s.dist ? s.dist.map((d, k) => `${k + 1}점 ${d}명`).join(", ") : "";
        const my = mine && mine[it.id] ? mine[it.id] : 0;
        const myGap = my ? Math.max(0, (it.importance - my) * 25) : null;
        return `<tr>
          <td class="item-col"><span class="rank">${i + 1}</span>${esc(it.name)}<div class="muted small">${esc(it.area.name)}</div></td>
          <td class="cmp-col">
            <div class="cmp-nums">
              ${mine ? `<span class="cmp-n"><small>내 점수</small><b class="${my ? "me-n" : "muted"}">${my || "-"}</b></span>` : ""}
              <span class="cmp-n"><small>팀 평균</small><b class="team-n">${s.avgCur.toFixed(1)}</b></span>
              <span class="cmp-n"><small>목표</small><b>${it.importance}</b></span>
            </div>
            ${track(it.importance, s.avgCur, my)}
          </td>
          <td class="c"><span class="gap-chip ${gapClass(Math.round(s.avgGap))}" ${tip ? `title="${esc(tip)}"` : ""}>${Math.round(s.avgGap)}</span></td>
          ${mine ? `<td class="c">${myGap === null ? '<span class="muted">-</span>' : `<span class="gap-chip ${gapClass(myGap)}">${myGap}</span>`}</td>` : ""}
          <td class="c">${mentorText(s.mentors)}</td>
          <td class="c"><span class="tag ${m.cls}">${m.label}</span></td>
          <td class="small">${esc(window.EDITION === "siemens" ? it.svs : it.base)}</td>
        </tr>`;
      }).join("")}</tbody>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    $("appTitle").textContent = window.APP_TEXT.title;
    const auth = findToken();
    if (!auth) { location.replace("/"); return; }
    $("linkBack").href = auth.admin ? "/admin" : "/";
    $("linkBack").textContent = auth.admin ? "관리자" : "내 진단";
    $("btnPrint").addEventListener("click", () => window.print());

    let t;
    try { t = await api("/api/team", { token: auth.token }); }
    catch (e) {
      if (e.status === 401) { location.replace("/"); return; }
      $("viewTeam").hidden = false; $("teamBody").hidden = true;
      $("notReady").hidden = false; $("notReady").textContent = e.message; return;
    }
    $("viewTeam").hidden = false;
    $("minN").textContent = t.min;
    renderKpis(t);
    if (!t.ready) {
      $("teamBody").hidden = true;
      $("notReady").hidden = false;
      $("notReady").innerHTML = `<h3 class="card-title">아직 집계할 수 없습니다</h3>
        <p class="muted">현재 참여자는 <b>${t.participants}명</b>입니다. 개인이 드러나지 않도록 <b>${t.min}명 이상</b>이 점수를 입력하면 팀 통계가 표시됩니다.</p>`;
      return;
    }
    // 내 점수: 일반 로그인일 때만 불러옵니다. (관리자는 개인 점수가 없음)
    let mine = null;
    if (!auth.admin) {
      try { mine = (await api("/api/me", { token: auth.token })).user.scores; } catch { /* 팀 평균만 표시 */ }
    }
    let sortKey = "team";
    const draw = () => renderTable(t, mine, sortKey);
    if (mine && Object.keys(mine).length) {
      $("sortSeg").hidden = false;
      $("sortSeg").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        sortKey = b.dataset.sort;
        [...$("sortSeg").children].forEach(x => x.classList.toggle("on", x === b));
        draw();
      });
    } else { mine = null; }
    renderRadar(t, mine);
    draw();
  });
})();
