# SA 역량 진단 및 학습 우선순위

순수 HTML·JavaScript·CSS + Cloudflare Pages Functions + D1.

- 사용자: `/` — 이름 + 숫자 4자리 비밀번호로 로그인, 20개 항목 자가 진단, 자동 저장, 내 리포트 인쇄/PDF
- 관리자: `/admin` — 팀 히트맵(Gap / 현재 점수), 팀 학습 우선순위(분포·멘토 후보·권장 방식), 참여자 관리(리포트 보기, 비밀번호 재설정, 삭제), **전체 리포트 PDF**

## 폴더 구조

```
public/                  정적 파일 (배포 대상)
  index.html             사용자 화면
  admin.html             관리자 화면
  assets/items.js        ★ 진단 항목·중요도·평가 기준·추천 문구·EDITION 설정
  assets/core.js         계산·리포트 공통 코드
  assets/app.js          사용자 화면 로직
  assets/admin.js        관리자 화면 로직
  assets/style.css
  assets/vendor/         Chart.js 4.4.1 (CDN 차단 환경 대비 로컬 포함)
functions/api/           API (Pages Functions)
lib/util.js              API 공통 코드 (해시·세션·검증)
schema.sql               D1 테이블
wrangler.toml            D1 연결 설정
```

## 배포 (최초 1회)

> Cloudflare 대시보드의 "파일 드래그 앤 드롭 업로드"는 정적 파일만 올라가고 API(Functions)가 빠집니다.
> 아래처럼 **Wrangler CLI** 또는 **Git 연결**로 배포하세요.

### 방법 A. Wrangler CLI

```bash
npm install -g wrangler
wrangler login

# 1) D1 데이터베이스 생성 → 출력된 database_id를 wrangler.toml에 붙여넣기
wrangler d1 create se-competency

# 2) 테이블 생성
wrangler d1 execute se-competency --remote --file=./schema.sql

# 3) Pages 프로젝트 생성 및 배포
wrangler pages project create se-competency --production-branch=main
wrangler pages deploy

# 4) 관리자 비밀번호 등록 (입력 프롬프트가 뜹니다)
wrangler pages secret put ADMIN_PASSWORD --project-name=se-competency
wrangler pages deploy   # 비밀번호 반영을 위해 한 번 더 배포
```

### 방법 B. Git(GitHub) 연결

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git
3. Build command: 비움 / Build output directory: `public`
4. 배포 후 프로젝트 Settings → Bindings → D1 database 추가 (변수 이름 `DB`)
5. Settings → Variables and Secrets → `ADMIN_PASSWORD` (Secret) 추가 → 재배포
6. 테이블 생성: D1 콘솔에서 `schema.sql` 내용을 실행하거나 `wrangler d1 execute ... --remote`

## 로컬 실행

```bash
echo 'ADMIN_PASSWORD=test1234' > .dev.vars
wrangler d1 execute se-competency --local --file=./schema.sql
wrangler pages dev            # http://localhost:8788
```

## 운영 메모

- **버전 전환**: `public/assets/items.js` 맨 위 `window.EDITION`
  - `"siemens"`: 우선순위 카드와 관리자 표에 SVS 단계·MEDDPICC 연결 표시
  - `"base"`: 교재 챕터·실습 템플릿 연결 표시
- **항목 수정**: `items.js`에서 문구·중요도·추천 문구를 바꾸면 됩니다.
  항목 **id**(e1~s4)를 바꾸거나 추가하면 `lib/util.js`의 `VALID_ITEM_IDS`도 같이 바꿔야 저장됩니다.
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
  `wrangler d1 execute se-competency --remote --command="DELETE FROM sessions; DELETE FROM users;"`
