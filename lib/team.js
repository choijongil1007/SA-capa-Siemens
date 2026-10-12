// 팀 통계 집계. 개인 점수·이름은 밖으로 내보내지 않고 집계값만 반환합니다.
import "./window-shim.js";
import "../public/assets/items.js"; // 항목·중요도의 단일 출처
import { parseScores, sanitizeScores } from "./util.js";

export const MIN_PARTICIPANTS = 3; // 이 인원 미만이면 팀 통계를 보여주지 않음 (2명이면 평균에서 상대 점수가 드러남)
export const MIN_DIST = 5;         // 점수 분포는 이 인원 이상일 때만 공개

const gapOf = (importance, v) => Math.max(0, (importance - v) * 25);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

export function aggregate(rows) {
  const areas = globalThis.AREAS;
  const people = rows.map(r => sanitizeScores(parseScores(r.scores)))
    .filter(sc => Object.keys(sc).length > 0);
  const total = areas.reduce((n, a) => n + a.items.length, 0);

  if (people.length < MIN_PARTICIPANTS) {
    return { ready: false, participants: people.length, min: MIN_PARTICIPANTS };
  }

  const items = {};
  for (const a of areas) for (const it of a.items) {
    const vals = people.map(sc => sc[it.id]).filter(Boolean);
    if (vals.length < MIN_PARTICIPANTS) { items[it.id] = { n: vals.length, hidden: true }; continue; }
    const gaps = vals.map(v => gapOf(it.importance, v));
    items[it.id] = {
      n: vals.length,
      avgCur: mean(vals),
      avgGap: mean(gaps),
      mentors: vals.filter(v => v >= 4).length,
      highGapPeople: gaps.filter(g => g >= 50).length,
      dist: vals.length >= MIN_DIST ? [1, 2, 3, 4, 5].map(s => vals.filter(v => v === s).length) : null,
    };
  }

  const areaStats = areas.map(a => {
    const vals = people.flatMap(sc => a.items.map(it => sc[it.id]).filter(Boolean));
    const gaps = people.flatMap(sc => a.items.filter(it => sc[it.id]).map(it => gapOf(it.importance, sc[it.id])));
    return vals.length >= MIN_PARTICIPANTS
      ? { id: a.id, avgCur: mean(vals), avgGap: mean(gaps) }
      : { id: a.id, hidden: true };
  });

  const perPerson = people.map(sc => {
    const ids = Object.keys(sc);
    const gaps = areas.flatMap(a => a.items.filter(it => sc[it.id]).map(it => gapOf(it.importance, sc[it.id])));
    return { cur: mean(ids.map(i => sc[i])), gap: mean(gaps), done: ids.length === total };
  });

  return {
    ready: true,
    min: MIN_PARTICIPANTS,
    participants: people.length,
    completed: perPerson.filter(p => p.done).length,
    avgCur: mean(perPerson.map(p => p.cur)),
    avgGap: mean(perPerson.map(p => p.gap)),
    areas: areaStats,
    items,
  };
}
