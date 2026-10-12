// 진단 항목 설정 ─ 항목·중요도·평가 기준·추천 실행 목표를 여기서 관리합니다.
// EDITION: "siemens" 이면 SVS 단계 연결을, "base" 이면 교재 챕터·실습 템플릿 연결을 보여줍니다.
window.EDITION = "siemens";

window.APP_TEXT = {
  title: "SA 역량 진단 및 학습 우선순위",
  subtitle: "Solution Architect Competency Assessment & Development Priorities",
  role: "SA",
};

// 평가 기준 (행동 기준)
window.LEVELS = [
  { score: 1, label: "경험 없음", desc: "해 본 적이 없거나, 무엇을 해야 하는지 모른다." },
  { score: 2, label: "도움 받아 수행", desc: "선배나 템플릿의 도움이 있어야 해낸다." },
  { score: 3, label: "혼자 수행", desc: "일반적인 딜에서는 혼자 해낸다." },
  { score: 4, label: "복잡한 상황에서도 수행", desc: "이해관계자가 많거나 경쟁이 치열한 딜에서도 해낸다." },
  { score: 5, label: "지도할 수 있음", desc: "다른 사람을 가르치거나, 팀 표준과 템플릿을 만든다." },
];

// svs: 지멘스판에서 보여줄 SVS 단계 / meddpicc: 연결 요소 / base: 기본판에서 보여줄 교재·템플릿
window.AREAS = [
  {
    id: "expertise", name: "전문성", weight: 5,
    svs: "Deep Dive(차별화 시연), 아키텍처·배포 전략, 보안 리뷰",
    meddpicc: "Decision Criteria, Competition",
    symptom: "기술 질문에 바로 답하지 못하고 검증이 길어진다.",
    items: [
      { id: "e1", short: "고객 환경 맞춤 설명", name: "제품의 핵심 기능과 아키텍처를 고객 환경에 맞춰 설명한다", importance: 5,
        svs: "Deep Dive, 아키텍처·배포 전략", meddpicc: "Dc", base: "Chapter 5 · 기억에 남는 데모",
        advice: "레거시 연동, 클라우드, 보안 규제 등 고객 환경 유형별 아키텍처 설명 스크립트를 만들고, 동료 앞에서 10분 시연하세요." },
      { id: "e2", short: "산업 용어로 대화", name: "고객 산업의 업무 흐름과 용어로 대화한다", importance: 4,
        svs: "IT Discovery", meddpicc: "I", base: "Chapter 4 · 고객 상황 이해와 문제 정의",
        advice: "주요 고객 산업 하나를 골라 업무 흐름과 핵심 용어 20개를 정리하고, 다음 미팅에서 고객의 언어로 문제를 다시 말해 보세요." },
      { id: "e3", short: "막힌 논의 정리", name: "기술적으로 막힌 논의를 정리하고 방향을 제시한다", importance: 5,
        svs: "Deep Dive, 아키텍처·배포 전략", meddpicc: "Ch", base: "Chapter 5 · 효과적인 기술 회의",
        advice: "최근 막혔던 기술 미팅 하나를 복기해 '쟁점 – 선택지 – 권고안' 한 장으로 정리하는 연습을 하세요." },
      { id: "e4", short: "기술·경쟁 동향 학습", name: "새 기술과 경쟁 동향을 정기적으로 학습해 업무에 반영한다", importance: 4,
        svs: "Deep Dive", meddpicc: "Co", base: "Chapter 4 · 배틀카드",
        advice: "매주 1시간씩 기술·경쟁 동향을 정리해 팀에 공유하는 루틴을 만드세요." },
    ],
  },
  {
    id: "comm", name: "기술 커뮤니케이션", weight: 5,
    svs: "Deep Dive, EB와 결과 리뷰, 미팅 후 다음 행동 요청",
    meddpicc: "Economic Buyer, Champion",
    symptom: "데모는 좋았는데 다음 단계가 정해지지 않는다.",
    items: [
      { id: "c1", short: "청중 맞춤 발표", name: "청중(실무자, 경영진)에 맞춰 발표 구성과 깊이를 조절한다", importance: 5,
        svs: "Deep Dive, EB 결과 리뷰", meddpicc: "EB", base: "Chapter 5 · C레벨 발표법",
        advice: "같은 내용을 실무자용 20분, 경영진용 5분 두 버전으로 만들어 리허설하세요." },
      { id: "c2", short: "결론부터 문서 작성", name: "제안서, 이메일 등 문서를 결론부터 명확하게 쓴다", importance: 4,
        svs: "평가 기준 정렬, POV 결과 보고", meddpicc: "Dc", base: "Chapter 4 · 프로젝트 성공 방안과 제안서",
        advice: "최근 쓴 제안서나 메일 3건을 '결론 – 근거 – 요청' 순서로 다시 써 보세요." },
      { id: "c3", short: "이의 제기 대응", name: "고객의 이의 제기를 받아 근거를 들어 대응한다", importance: 5,
        svs: "Deep Dive, 보안 리뷰", meddpicc: "Co", base: "Chapter 5 · 이의 제기를 기회로",
        advice: "자주 받는 이의 제기 5가지와 근거 있는 답변을 정리해 배틀카드 FAQ에 넣으세요." },
      { id: "c4", short: "다음 행동 요청", name: "데모나 미팅 후 고객 반응을 확인하고 다음 행동을 요청한다", importance: 5,
        svs: "전 단계", meddpicc: "Dp", base: "Chapter 5 · 상황별 커뮤니케이션",
        advice: "모든 데모와 미팅을 '무엇을, 왜, 누가, 언제'가 담긴 다음 행동 요청으로 끝내는 연습을 하세요." },
    ],
  },
  {
    id: "problem", name: "문제 해결", weight: 4.5,
    svs: "IT Discovery, 애플리케이션 포트폴리오 평가, POV",
    meddpicc: "Identify Pain, Metrics",
    symptom: "고객이 말한 요구대로만 데모와 PoC를 준비한다.",
    items: [
      { id: "p1", short: "요구 분석·해결안", name: "고객 요구를 쪼개 분석하고, 논리적으로 해결 방안을 도출한다", importance: 5,
        svs: "IT Discovery, 포트폴리오 평가", meddpicc: "I", base: "Chapter 3 · 구매여정 질문 리스트",
        advice: "고객 요구를 기능·비기능·제약 조건으로 나눠 정리하는 습관을 딜마다 적용하세요." },
      { id: "p2", short: "본질적 문제 재정의", name: "고객이 말한 문제를 그대로 받지 않고, 본질적인 문제로 재정의한다", importance: 5,
        svs: "IT Discovery", meddpicc: "I, M", base: "Chapter 4 · 문제 정의서",
        advice: "진행 중인 딜 하나로 문제 정의서를 작성해 '고객이 말한 문제'와 '본질적 문제'를 구분해 보세요." },
      { id: "p3", short: "협업·에스컬레이션", name: "혼자 풀 수 없는 문제는 협업하거나 적시에 에스컬레이션한다", importance: 4,
        svs: "아키텍처·배포 전략, 보안 리뷰", meddpicc: "P", base: "Chapter 2 · 팀 간 협업",
        advice: "에스컬레이션 기준(언제, 누구에게, 무엇을)을 팀과 합의해 문서로 만드세요." },
      { id: "p4", short: "선제 개선안 제안", name: "고객이 요청하기 전에 개선안이나 대안을 먼저 제안한다", importance: 4,
        svs: "포트폴리오 평가, POV", meddpicc: "M", base: "Chapter 4 · 추진 방안",
        advice: "다음 고객 미팅마다 고객이 묻지 않은 개선안 하나를 준비해 가세요." },
    ],
  },
  {
    id: "customer", name: "고객 이해", weight: 4,
    svs: "핵심 이해관계자 참여, EB 정렬 지원",
    meddpicc: "Champion, Economic Buyer, Decision Process",
    symptom: "기술 담당자만 만나고 결정권자를 모른다.",
    items: [
      { id: "u1", short: "구매 여정 단계 파악", name: "고객이 구매 여정의 어느 단계에 있는지 파악하고 그에 맞게 대응한다", importance: 4,
        svs: "비전 정렬 미팅, EB 정렬", meddpicc: "Dp", base: "Chapter 3 · 고객 여정 맵",
        advice: "진행 중인 딜의 고객 여정 맵을 작성하고, 지금 고객이 어느 단계에서 무엇을 고민하는지 정리하세요." },
      { id: "u2", short: "이해관계자 파악", name: "이해관계자별 관심사와 영향력을 파악한다", importance: 5,
        svs: "핵심 이해관계자 참여", meddpicc: "Ch, EB", base: "Chapter 3 · 구매 그룹 이해",
        advice: "딜별 이해관계자 지도(역할, 관심사, 영향력, 우리에 대한 지지)를 만들고 영업과 공유하세요." },
      { id: "u3", short: "열린 질문", name: "고객의 말을 끝까지 듣고 열린 질문으로 숨은 우선순위를 끌어낸다", importance: 4,
        svs: "IT Discovery", meddpicc: "I", base: "Chapter 3 · 구매여정 질문 리스트",
        advice: "다음 Discovery 미팅용 열린 질문 10개를 미리 쓰고, 닫힌 질문을 열린 질문으로 바꾸는 연습을 하세요." },
      { id: "u4", short: "KPI와 연결", name: "고객의 비즈니스 모델과 KPI를 기술 제안과 연결한다", importance: 3,
        svs: "EB 정렬, EB 결과 리뷰", meddpicc: "M, EB", base: "Chapter 4 · 프로젝트 성공 방안",
        advice: "고객사 공개 자료에서 KPI 3개를 찾고, 우리 기술이 어떤 숫자를 바꾸는지 한 줄로 연결해 보세요." },
    ],
  },
  {
    id: "strategy", name: "기술 전략 수립", weight: 4,
    svs: "Deep Dive(차별화), 평가 기준 정렬·MAP, POV 성공 기준",
    meddpicc: "Decision Criteria, Competition",
    symptom: "평가 기준이 경쟁사에 유리하게 굳어진다.",
    items: [
      { id: "s1", short: "TAP 정리", name: "고객 기술 현황을 조사해 기술 프로파일(TAP)로 정리한다", importance: 3,
        svs: "IT Discovery, 포트폴리오 평가", meddpicc: "I", base: "Chapter 4 · TAP 기술 캔버스",
        advice: "핵심 고객 한 곳의 TAP를 작성하고 기술 전략 캔버스 한 장으로 요약하세요." },
      { id: "s2", short: "차별점 정리", name: "경쟁 제품과 비교해 우리 차별점을 근거로 정리한다", importance: 4,
        svs: "Deep Dive", meddpicc: "Co", base: "Chapter 4 · 배틀카드",
        advice: "차별점 3개를 '유일한가, 고객에게 가치 있는가, 증명할 수 있는가' 기준으로 검증하세요." },
      { id: "s3", short: "평가 기준 공동 설계", name: "고객의 평가 기준과 PoC 성공 기준을 고객과 함께 설계한다", importance: 5,
        svs: "평가 기준 정렬, POV", meddpicc: "Dc", base: "Chapter 4 · 평가 기준서",
        advice: "진행 중인 딜의 평가 기준서와 PoC 성공 기준 초안을 만들어, 고객과 함께 다듬으세요." },
      { id: "s4", short: "기술 활동 계획 공유", name: "딜 단계별 기술 활동 계획을 세우고 영업과 공유한다", importance: 4,
        svs: "핵심 이해관계자 참여, MAP", meddpicc: "P, Dp", base: "Chapter 4 · 프로젝트 성공 방안",
        advice: "딜 단계별 기술 활동과 고객 측 담당자를 공동 실행 계획(MAP)으로 정리해 영업과 공유하세요." },
    ],
  },
];
