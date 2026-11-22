# PreSales 역량 진단 및 학습 우선순위

순수 HTML·JavaScript·CSS + Cloudflare Workers + D1.

- 사용자: `/` — 이름 + 숫자 4자리 비밀번호로 로그인, 25개 항목 자가 진단, 자동 저장, 내 리포트 인쇄/PDF
- 팀 통계: `/team` — 로그인한 사용자(또는 관리자)가 보는 이름 없는 팀 집계. 참여자 3명 미만이면 숨김, 점수 분포는 5명 이상일 때만 툴팁으로 표시 (`lib/team.js`의 `MIN_PARTICIPANTS`, `MIN_DIST`). 내 리포트 인쇄에는 팀 평균 비교가 함께 나옵니다.
- 관리자: `/admin` — 팀 히트맵(Gap / 현재 점수), 팀 학습 우선순위(분포·멘토 후보·권장 방식), 참여자 관리(리포트 보기, 비밀번호 재설정, 삭제), **전체 리포트 PDF**

## 폴더 구조

```
public/                  정적 파일 (배포 대상)
  index.html             사용자 화면
  admin.html             관리자 화면
  assets/items.js        ★ 진단 항목·중요도·평가 기준·BSA 단계·추천 문구
  assets/core.js         계산·리포트 공통 코드
  assets/app.js          사용자 화면 로직
  assets/admin.js        관리자 화면 로직
  assets/style.css
  assets/vendor/         Chart.js 4.4.1 (CDN 차단 환경 대비 로컬 포함)
functions/api/           API 핸들러 (src/worker.js가 연결)
src/worker.js            Workers 진입점
lib/util.js              API 공통 코드 (해시·세션·검증)
schema.sql               D1 테이블
wrangler.toml            배포 설정 (고객사별 환경과 D1 연결)
```

## 배포

Cloudflare **Workers**(정적 파일 assets + API) + **D1**입니다. 코드는 하나이고, 고객사(워크숍)마다 배포와 DB만 따로 둡니다.

GitHub `main` 브랜치에 병합하면 Cloudflare Workers Builds가 기본 환경(지멘스)을 자동 배포합니다 (Production branch: `main`). 다른 고객사 환경은 아래 명령으로 배포합니다.
그래서 기능과 질문은 모든 고객사가 같고, 데이터는 고객사별 DB에 따로 저장됩니다.

| 고객사 | 배포 이름 (주소) | D1 DB | 배포 명령 |
|---|---|---|---|
| 지멘스 | sa-capa-siemens | se-competency | `npx wrangler deploy` |
| 쿠도 | sa-capa-cudo | se-competency-cudo | `npx wrangler deploy --env cudo` |

### 새 고객사 추가 (예: 쿠도)

```bash
npx wrangler login

# 1) 고객사 전용 DB 만들기 → 출력된 database_id를 wrangler.toml의 [env.cudo] 블록에 붙여넣기
npx wrangler d1 create se-competency-cudo

# 2) 테이블 만들기
npx wrangler d1 execute se-competency-cudo --remote --env cudo --file=./schema.sql

# 3) 그 고객사의 관리자 비밀번호 등록 (입력 프롬프트가 뜹니다)
npx wrangler secret put ADMIN_PASSWORD --env cudo

# 4) 배포 → https://sa-capa-cudo.<계정>.workers.dev
npx wrangler deploy --env cudo
```

다른 고객사는 `wrangler.toml`의 `[env.cudo]` 블록을 복사해 이름(name)과 DB만 바꾸면 됩니다.
DB 연결(`d1_databases`)은 환경 사이에 상속되지 않으니 블록마다 반드시 적어야 합니다.

## 로컬 실행

```bash
echo 'ADMIN_PASSWORD=test1234' > .dev.vars
npx wrangler d1 execute se-competency --local --file=./schema.sql
npx wrangler dev                    # 지멘스 설정, http://localhost:8787
# 쿠도 설정으로 띄우려면 --env cudo (DB 초기화도 --env cudo로)
```

## 운영 메모

- **진단 항목**: 5개 영역 × 5개 = 25개. 항목마다 BSA 단계(인식·고려·평가·구매)와 고객 대응 기술(① 질문 ~ ⑥ 내부 조율, AI, 기본기)이 붙어 있고, 우선순위 카드와 관리자·팀 통계 표에 BSA 단계가 표시됩니다. 모든 고객사 배포가 같은 항목을 씁니다.
- **항목 수정**: `items.js`에서 문구·중요도·추천 문구를 바꾸면 됩니다.
  항목 **id**(e1~s5)를 바꾸거나 추가하면 `lib/util.js`의 `VALID_ITEM_IDS`도 같이 바꿔야 저장됩니다.
- **Gap** = (항목 중요도 − 현재 점수) × 25, 0 미만은 0.
- **권장 방식** (관리자 표):
  - 평균 Gap 50 이상이고 멘토 후보(4~5점) 없음 → 팀 교육
  - 평균 Gap 25 이상이고 멘토 후보 있음 → 사내 멘토링
  - 평균 Gap 25 이상이고 멘토 후보 없음 → 팀 교육
  - 그 외 개인 Gap 50 이상인 사람이 있음 → 개인 코칭 / 없음 → 유지
- **보안**
  - 비밀번호는 PBKDF2(10만 회)로 해시 저장, 원문은 저장하지 않습니다.
  - 같은 이름으로 5회 연속 틀리면 10분 잠금. 관리자가 "비밀번호 재설정"으로 해제할 수 있습니다.
  - 동명이인은 이름 뒤에 구분자를 붙이도록 안내합니다 (예: 홍길동A).
  - 관리자 세션은 브라우저 탭을 닫으면 사라지고, 서버 쪽 세션은 12시간 후 만료됩니다.
- **PDF**: 관리자 "전체 리포트 PDF" → 인쇄 창에서 "PDF로 저장".
  1~2쪽 팀 요약(히트맵, 팀 우선순위 Top 10), 이후 1인 1쪽 개인 리포트.
  인쇄 설정에서 "배경 그래픽"을 켜야 색이 나옵니다.
- **교육 후 데이터 정리**: 관리자 화면에서 참여자별 삭제, 또는
  `npx wrangler d1 execute se-competency --remote --command="DELETE FROM sessions; DELETE FROM users;"` (쿠도는 DB 이름을 se-competency-cudo로 바꾸고 `--env cudo` 추가)
