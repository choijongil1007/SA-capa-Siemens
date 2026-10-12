// 공통: API 호출, 계산, 개인 리포트 렌더링 (사용자 화면과 어드민 화면이 함께 씀)
(function () {
  const ALL_ITEMS = window.AREAS.flatMap(a => a.items.map(i => ({ ...i, area: a })));
  const TOTAL = ALL_ITEMS.length;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function api(path, { method = "GET", body, token } = {}) {
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = "Bearer " + token;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch { /* 빈 응답 */ }
    if (!res.ok) {
      const err = new Error(data.error || "요청을 처리하지 못했습니다.");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function gapOf(importance, current) {
    return current > 0 ? Math.max(0, (importance - current) * 25) : null;
  }

  // 점수 맵 → 요약 통계
  function analyze(scores = {}) {
    const items = ALL_ITEMS.map(it => {
      const current = Number(scores[it.id]) || 0;
      return { ...it, current, gap: gapOf(it.importance, current) };
    });
    const rated = items.filter(i => i.current > 0);
    const areas = window.AREAS.map(a => {
      const ai = items.filter(i => i.area.id === a.id);
      const ar = ai.filter(i => i.current > 0);
      return {
        ...a,
        avgImportance: ai.reduce((s, i) => s + i.importance, 0) / ai.length,
        avgCurrent: ar.length ? ar.reduce((s, i) => s + i.current, 0) / ar.length : 0,
        avgGap: ar.length ? ar.reduce((s, i) => s + i.gap, 0) / ar.length : null,
      };
    });
    const priorities = rated.filter(i => i.gap > 0)
      .sort((a, b) => b.gap - a.gap || b.importance - a.importance || b.area.weight - a.area.weight);
    return {
      items, areas, priorities,
      rated: rated.length, total: TOTAL,
      avgCurrent: rated.length ? rated.reduce((s, i) => s + i.current, 0) / rated.length : 0,
      avgGap: rated.length ? rated.reduce((s, i) => s + i.gap, 0) / rated.length : 0,
    };
  }

  function gapClass(gap) {
    if (gap === null || gap === undefined) return "g-none";
    if (gap >= 75) return "g-75";
    if (gap >= 50) return "g-50";
    if (gap > 0) return "g-25";
    return "g-0";
  }

  function linkText(item) {
    return window.EDITION === "siemens"
      ? `SVS: ${item.svs} · MEDDPICC: ${item.meddpicc}`
      : `교재: ${item.base}`;
  }

  function fmtDate(ms) {
    if (!ms) return "-";
    const d = new Date(ms);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function drawRadar(canvas, stats) {
    if (!window.Chart) return null;
    return new Chart(canvas.getContext("2d"), {
      type: "radar",
      data: {
        labels: stats.areas.map(a => a.name),
        datasets: [
          { label: "중요도", data: stats.areas.map(a => +a.avgImportance.toFixed(2)),
            borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", borderDash: [4, 4],
            pointBackgroundColor: "#6366f1", borderWidth: 1.5 },
          { label: "현재 역량", data: stats.areas.map(a => +a.avgCurrent.toFixed(2)),
            borderColor: "#059669", backgroundColor: "rgba(16,185,129,0.22)",
            pointBackgroundColor: "#059669", borderWidth: 2 },
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

  // 개인 리포트 (사용자 '내 리포트'와 어드민 인쇄에서 공통 사용)
  // 인쇄용: 화면에 보이지 않는 영역에서도 그려지도록 고정 크기 캔버스로 그린 뒤 이미지로 바꿉니다.
  function radarImage(stats) {
    if (!window.Chart) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 900; canvas.height = 560;
    const chart = new Chart(canvas.getContext("2d"), {
      type: "radar",
      data: {
        labels: stats.areas.map(a => a.name),
        datasets: [
          { label: "중요도", data: stats.areas.map(a => +a.avgImportance.toFixed(2)), borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.08)", borderDash: [8, 8], borderWidth: 3, pointBackgroundColor: "#6366f1", pointRadius: 5 },
          { label: "현재 역량", data: stats.areas.map(a => +a.avgCurrent.toFixed(2)), borderColor: "#059669",
            backgroundColor: "rgba(16,185,129,0.22)", borderWidth: 4, pointBackgroundColor: "#059669", pointRadius: 5 },
        ],
      },
      options: {
        animation: false, responsive: false, devicePixelRatio: 1,
        scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 18 }, backdropColor: "transparent" },
          pointLabels: { font: { size: 24, weight: "600" } } } },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 24, font: { size: 22 } } } },
      },
    });
    const url = canvas.toDataURL("image/png");
    chart.destroy();
    return url;
  }

  function renderReport(el, user, { topN = 5, asImage = false } = {}) {
    const st = analyze(user.scores);
    const top = st.priorities.slice(0, topN);
    el.innerHTML = `
      <div class="report">
        <div class="report-head">
          <div>
            <div class="report-kicker">${esc(window.APP_TEXT.title)}</div>
            <h2 class="report-name">${esc(user.name)}</h2>
            <div class="muted small">최종 저장: ${fmtDate(user.updatedAt)}</div>
          </div>
          <div class="kpis">
            <div class="kpi"><div class="kpi-l">진행률</div><div class="kpi-v">${st.rated}<span>/ ${st.total}</span></div></div>
            <div class="kpi"><div class="kpi-l">평균 현재 역량</div><div class="kpi-v">${st.avgCurrent.toFixed(1)}<span>/ 5.0</span></div></div>
            <div class="kpi"><div class="kpi-l">평균 Gap</div><div class="kpi-v">${Math.round(st.avgGap)}<span>점</span></div></div>
          </div>
        </div>
        <div class="report-grid">
          <div class="card pad">
            <h3 class="card-title">역량별 중요도 vs 현재 역량</h3>
            ${asImage ? `<img class="radar-img" alt="역량별 중요도와 현재 역량 방사형 차트" src="${radarImage(st)}" />`
                      : `<div class="chart-box"><canvas></canvas></div>`}
          </div>
          <div class="card pad">
            <h3 class="card-title">역량별 요약</h3>
            <table class="tbl">
              <thead><tr><th>역량</th><th class="c">중요도</th><th class="c">현재</th><th class="c">평균 Gap</th></tr></thead>
              <tbody>${st.areas.map(a => `
                <tr><td>${esc(a.name)}</td><td class="c">${a.weight}</td>
                <td class="c">${a.avgCurrent ? a.avgCurrent.toFixed(1) : "-"}</td>
                <td class="c"><span class="gap-chip ${gapClass(a.avgGap === null ? null : Math.round(a.avgGap))}">${a.avgGap === null ? "-" : Math.round(a.avgGap)}</span></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card pad">
          <h3 class="card-title">학습 우선순위 Top ${topN} <span class="muted small">Gap = (중요도 − 현재 역량) × 25</span></h3>
          ${top.length ? `<ol class="prio">${top.map((it, i) => `
            <li class="prio-item">
              <div class="prio-head">
                <span class="prio-rank">${i + 1}</span>
                <span class="prio-name">${esc(it.name)}</span>
                <span class="gap-chip ${gapClass(it.gap)}">Gap ${it.gap}</span>
              </div>
              <div class="prio-meta">${esc(it.area.name)} · 중요도 ${it.importance} · 현재 ${it.current}점 · ${esc(linkText(it))}</div>
              <div class="prio-advice"><b>추천 실행 목표</b> ${esc(it.advice)}</div>
            </li>`).join("")}</ol>`
            : `<p class="muted">${st.rated ? "모든 항목이 중요도 수준에 도달했습니다." : "아직 진단을 시작하지 않았습니다."}</p>`}
        </div>
      </div>`;
    return asImage ? null : drawRadar(el.querySelector("canvas"), st);
  }

  window.Core = { api, analyze, gapOf, gapClass, linkText, esc, fmtDate, drawRadar, renderReport, ALL_ITEMS, TOTAL };
})();
