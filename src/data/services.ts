// 서비스 목록. 원본은 「기존 서비스 연결 정리 2026-10-18.md」 3절이다(2026년 10월 18일 기준).
// 같은 문서 6절의 확인하지 못한 항목(청년ON, 청년마음클리닉 접수, 마들랜, 온라인 기지개학교 모집 등)은 넣지 않았다.
// 추천 카드의 값(이유 말고 전부)은 여기서만 가져온다. AI는 번호와 맞는 이유만 고른다.
// 공식 주소는 2026-10-19에 모두 열어 응답을 확인했다.
import type { CategorySlug } from "@/site/ia";

export type ServiceStatus =
  | { kind: "always"; text: string } // 상시
  | { kind: "rounds"; text: string } // 기수별·운영기관별 모집. 공고를 확인해야 함
  | { kind: "closed"; text: string; next: string }; // 이번 모집 끝. 추천 목록에서 뺀다

export type Contact = { label: string; tel: string; how?: string };

export type Service = {
  id: string;
  name: string;
  org: string;
  category: CategorySlug;
  /** 위기 안내에만 쓰는 곳(109, 1577-0199, 마음이, 119·112) */
  crisis?: boolean;
  what: string;
  /** 대상 조건 글(공식 안내 그대로) */
  target: string;
  /** 조건 맞춰 보기에 쓰는 값. 정해진 것이 없으면 null */
  age: [number, number] | null;
  /** seoul: 서울 거주 조건. any: 거주지 조건 없음. district: 그 자치구 주민 */
  residence: "seoul" | "any" | "district";
  income: string | null;
  start: string;
  steps?: string[];
  after?: string;
  hours: string;
  place?: string;
  contacts: Contact[];
  url?: { label: string; href: string };
  status: ServiceStatus;
  programs?: string[];
  note?: string;
  situations: number[];
  sources: number[];
};

export const SERVICES: Service[] = [
  // ───── 3-1. 위기 ─────
  {
    id: "s01",
    name: "자살예방상담전화 109",
    org: "보건복지부",
    category: "life",
    crisis: true,
    what: "자살 위기와 우울에 대한 전문 상담을 해요. 가족이나 지인의 어려움도 상담할 수 있어요.",
    target: "전 국민",
    age: null,
    residence: "any",
    income: null,
    start: "국번 없이 109에 전화해요.",
    hours: "24시간",
    contacts: [{ label: "자살예방상담전화", tel: "109" }],
    status: { kind: "always", text: "상시" },
    note: "2024년 1월 여러 상담 번호를 109 하나로 합쳤어요. 연결이 늦을 수 있어 1577-0199를 함께 안내해요.",
    situations: [1],
    sources: [9],
  },
  {
    id: "s02",
    name: "정신건강위기상담전화 1577-0199",
    org: "전국 공통 번호(서울은 서울특별시 운영)",
    category: "life",
    crisis: true,
    what: "정신건강 위기 전화 상담을 해요.",
    target: "전 국민",
    age: null,
    residence: "any",
    income: null,
    start: "1577-0199에 전화해요.",
    hours: "24시간",
    contacts: [{ label: "정신건강위기상담전화", tel: "1577-0199" }],
    status: { kind: "always", text: "상시" },
    note: "서울시가 2026년 2월 AI 챗봇 마음이와 함께 운영 방식을 바꿨어요.",
    situations: [1],
    sources: [3],
  },
  {
    id: "s03",
    name: "마음이(서울시 자살예방센터 AI 챗봇)",
    org: "서울시 자살예방센터",
    category: "life",
    crisis: true,
    what: "우울·불안·자살 위기에 공감 대화를 하다가, 3~4번 주고받은 뒤 내용에 따라 실시간 채팅 상담이나 전화 상담으로 넘겨 줘요.",
    target: "전화가 부담스러워 글로 말하고 싶은 사람",
    age: null,
    residence: "any",
    income: null,
    start: "서울시 자살예방센터 누리집에서 시작해요. 로그인이 없고 PC와 휴대폰에서 쓸 수 있어요.",
    hours: "24시간(체험 기사 기준)",
    contacts: [],
    url: { label: "서울시 자살예방센터", href: "https://www.seoulspc.or.kr" },
    status: { kind: "always", text: "상시" },
    note: "위기 상황에서 전화가 어려울 때 글로 시작해 사람 상담으로 넘어가는 입구로 안내해요. 2026년 4월 온 프로젝트 발표에는 마음e로 적혀 있어요.",
    situations: [1],
    sources: [3, 4, 1],
  },
  {
    id: "s04",
    name: "119·112",
    org: "소방·경찰",
    category: "life",
    crisis: true,
    what: "생명이 위험한 응급 상황에 출동해요.",
    target: "누구나",
    age: null,
    residence: "any",
    income: null,
    start: "119나 112에 전화해요.",
    hours: "24시간",
    contacts: [
      { label: "응급(소방)", tel: "119" },
      { label: "응급(경찰)", tel: "112" },
    ],
    status: { kind: "always", text: "상시" },
    note: "해치는 직접 신고하지 않고 번호와 거는 방법을 보여 줘요.",
    situations: [1],
    sources: [],
  },

  // ───── 3-2. 마음 건강 ─────
  {
    id: "s05",
    name: "자치구 정신건강복지센터",
    org: "서울 각 자치구",
    category: "mind",
    what: "상담, 검사, 치료 연계, 사례관리를 해요. 공공기관이라 무료예요.",
    target: "그 자치구 주민",
    age: null,
    residence: "district",
    income: null,
    start: "사는 자치구의 센터에 전화하거나 방문해요. 서울시 블루터치 자가검진 결과에서 도움 요청을 누르면 사는 곳 가까운 센터로 이어져요.",
    hours: "센터마다 다름",
    contacts: [],
    url: { label: "블루터치(서울시 정신건강 통합 플랫폼)", href: "https://blutouch.net" },
    status: { kind: "always", text: "상시" },
    note: "노원구는 2026년 2월 19~39세 청년심리상담센터를 따로 열었고, 고위험군은 구 정신건강복지센터로 넘겨요.",
    situations: [2],
    sources: [16],
  },
  {
    id: "s06",
    name: "전국민 마음투자 지원사업",
    org: "보건복지부",
    category: "mind",
    what: "전문 심리상담 바우처를 줘요. 120일 안에 8회 상담을 받아요.",
    target:
      "우울·불안 등으로 상담이 필요하다고 인정받은 사람. 정신건강복지센터 의뢰서, 진단서, 건강검진 결과 같은 인정 서류가 먼저 필요해요.",
    age: null,
    residence: "any",
    income: null,
    start: "복지로 온라인이나 사는 곳 동주민센터에서 신청해요.",
    hours: "복지로 온라인, 동주민센터 방문",
    contacts: [],
    url: { label: "복지로", href: "https://www.bokjiro.go.kr" },
    status: { kind: "always", text: "상시" },
    note: "2026년부터 1년에 한 번만 신청한다는 안내가 있어요. 인정 서류를 받는 첫 관문으로 정신건강복지센터를 먼저 잇는 편이 순서상 맞아요.",
    situations: [2],
    sources: [10],
  },
  {
    id: "s07",
    name: "서울 청년 마음건강 지원사업",
    org: "서울특별시",
    category: "mind",
    what: "전문 상담사와 1:1 심리상담을 최대 6회 받아요.",
    target: "서울 거주 만 19~39세(1986~2007년생, 제대군인은 최대 3년 연장)",
    age: [19, 39],
    residence: "seoul",
    income: null,
    start: "청년몽땅정보통에서 온라인으로 신청해요. 제출 서류는 없어요.",
    hours: "청년몽땅정보통 온라인",
    contacts: [],
    url: { label: "모집 공고(4차 추가모집)", href: "https://news.seoul.go.kr/gov/archives/580787" },
    status: {
      kind: "closed",
      text: "2026년 4차 추가모집이 9월 15일에 끝났어요. 1년에 네 번 모집해요.",
      next: "다음 모집은 청년몽땅정보통 알림으로 확인해요.",
    },
    note: "사람이 넘치면 신청순과 직전 연도 참여 여부로 골라요.",
    situations: [2],
    sources: [8],
  },

  // ───── 3-3. 외로움 ─────
  {
    id: "s08",
    name: "외로움안녕120",
    org: "서울시복지재단 고립예방센터",
    category: "relation",
    what: "전문 상담사와 통화해요. 정보 안내, 외로움 대화, 고립·은둔 가구 발굴, 긴급 위기 대응, 필요한 서비스 연결을 해요.",
    target: "외로움을 느끼는 서울 시민, 고립 당사자, 가족과 이웃. 나이 제한이 없어요.",
    age: null,
    residence: "seoul",
    income: null,
    start: "120에 전화한 뒤 5번을 눌러요.",
    hours: "365일 24시간",
    contacts: [
      { label: "외로움안녕120", tel: "120", how: "120에 전화한 뒤 5번" },
      { label: "고립예방센터 문의", tel: "02-6353-0341" },
    ],
    url: { label: "외로움안녕120 안내", href: "https://news.seoul.go.kr/welfare/archives/569295" },
    status: { kind: "always", text: "상시" },
    note: "2025년 이용자의 18.8%가 청년이고, 상담의 61.4%가 밤 시간이에요.",
    situations: [3, 4, 5],
    sources: [6, 1],
  },
  {
    id: "s09",
    name: "서울마음편의점",
    org: "서울특별시",
    category: "relation",
    what: "라면과 차를 무료로 먹으며 쉬는 공간이에요. 안에서 외로움 자가진단, 상담, 정보 안내를 받아요.",
    target: "외로움이나 고립감을 느끼는 서울 시민 누구나",
    age: null,
    residence: "seoul",
    income: null,
    start: "예약 없이 방문해요. 들어갈 때 간단한 확인표를 써요.",
    hours: "지점마다 다름(120 문의)",
    contacts: [{ label: "120다산콜", tel: "120" }],
    url: { label: "서울마음편의점 안내", href: "https://mediahub.seoul.go.kr/archives/2017960" },
    status: { kind: "always", text: "상시" },
    note: "2025년 4~12월 5만 9,605명이 이용했어요. 2026년에 청년마음편의점 5곳을 대학가·학원가·지하철역 근처에 새로 열 계획이에요.",
    situations: [3],
    sources: [7, 1],
  },
  {
    id: "s10",
    name: "고립예방플랫폼 똑똑",
    org: "서울시복지재단",
    category: "relation",
    what: "외로움·고립 자가진단, 생성형 AI 답변, 주변 고립 이웃을 알리는 위기주민 알리기, 지원사업 검색, 협력기관 지도를 제공해요.",
    target: "고립·은둔 시민과 외로운 시민",
    age: null,
    residence: "seoul",
    income: null,
    start: "누리집에 들어가 자가진단이나 지원사업 검색을 해요.",
    hours: "온라인 상시",
    contacts: [],
    url: { label: "고립예방플랫폼 똑똑", href: "https://sihsc.welfare.seoul.kr" },
    status: { kind: "always", text: "상시" },
    note: "2023년에 열고 2025년 7월 1일 대상을 넓혀 다시 열었어요.",
    situations: [3],
    sources: [5],
  },

  // ───── 3-4. 고립·은둔 전담 ─────
  {
    id: "s11",
    name: "서울청년기지개센터",
    org: "서울특별시",
    category: "relation",
    what: "고립·은둔 청년 전담기관이에요. 심리지원과 마음건강 정책 연계, 진로·취업 역량, 대인관계, 활동·체험, 온라인 프로그램, 생활습관, 공동생활(쉐어하우스), 소규모 방문상담을 해요.",
    target: "서울 거주 만 19~39세 고립·은둔 청년과 가족. 소득 조건은 안내에 없어요.",
    age: [19, 39],
    residence: "seoul",
    income: null,
    start: "청년몽땅정보통에서 신청해요. 상시 모집이에요.",
    steps: [
      "청년몽땅정보통에 로그인해요.",
      "금융복지 → 복지 지원 → 고립은둔청년 지원으로 들어가요.",
      "자격을 스스로 확인하고 개인정보 이용에 동의해요.",
      "신청서를 써요.",
      "별도 링크의 설문을 끝까지 마쳐요. 설문을 끝내지 않으면 참여가 어려울 수 있어요.",
      "신청을 마치면 개별 면접을 거쳐 선정돼요.",
    ],
    after: "2026년 흐름은 신청 → 광역센터 조기진단·초기상담 → 사는 곳의 지역센터예요.",
    hours: "센터 공간 평일 9~18시(고립·은둔 청년이면 언제든 방문)",
    place: "종로구 이화장길 70-15",
    contacts: [{ label: "서울청년기지개센터", tel: "02-6953-2520" }],
    url: { label: "기지개센터 신청 안내(청년몽땅정보통)", href: "https://youth.seoul.go.kr/infoData/plcyInfo/view.do?key=2309150002&plcyBizId=V202500009" },
    status: { kind: "always", text: "상시 모집" },
    programs: [
      "기지개 마음동행단: 정신건강 전문가가 찾아가는 대면상담",
      "서울In챌린지: 온라인 일경험과 자원봉사",
      "서울Go챌린지: 손목닥터9988 걷기 미션으로 2~3명이 함께 외출",
      "문화체육처방",
      "마음나눌개: 유기동물 돌봄",
    ],
    note: "신청 단계는 2025년 판 청년몽땅정보통 안내를 따랐어요. 대상인지 헷갈리면 센터(02-6953-2520)에 먼저 물어볼 수 있어요. 광역센터를 1곳에서 2곳으로, 지역센터를 15곳에서 2027년까지 25곳으로 늘려요.",
    situations: [4, 9],
    sources: [2, 17, 1],
  },
  {
    id: "s12",
    name: "서울잇다플레이스",
    org: "서울시복지재단",
    category: "relation",
    what: "청년기 뒤에도 지원이 끊기지 않게 하는 중장년 고립 지원 거점이에요. 상담과 휴식 공간이 있어요.",
    target: "40~64세(중장년 고립·은둔)",
    age: [40, 64],
    residence: "seoul",
    income: null,
    start: "02-6353-0359로 문의하거나 고립예방플랫폼 똑똑을 이용해요.",
    hours: "평일 10~18시(공휴일·주말 휴관)",
    place: "성동구 왕십리로 135, 2층",
    contacts: [{ label: "서울잇다플레이스", tel: "02-6353-0359" }],
    url: { label: "서울잇다플레이스 안내", href: "https://mediahub.seoul.go.kr/archives/2019485" },
    status: { kind: "always", text: "상시" },
    note: "2026년 하반기에 중장년(40~64세) 전담클리닉을 운영할 계획이에요.",
    situations: [5],
    sources: [1, 14],
  },
  {
    id: "s13",
    name: "고립은둔청소년 원스톱패키지",
    org: "학교밖청소년지원센터",
    category: "relation",
    what: "학교밖청소년지원센터가 고립·은둔 청소년을 지원해요.",
    target: "13~18세 청소년",
    age: [13, 18],
    residence: "seoul",
    income: null,
    start: "노원·도봉·성북·송파 학교밖청소년지원센터에 문의한다(2027년까지 9곳으로 늘림).",
    hours: "센터마다 다름",
    contacts: [],
    status: { kind: "always", text: "상시" },
    note: "서울시 청소년 채팅상담 마음톡톡과 함께 발표됐어요.",
    situations: [5],
    sources: [1],
  },

  // ───── 3-5. 일과 진로 ─────
  {
    id: "s14",
    name: "청년도전지원사업",
    org: "고용노동부",
    category: "job",
    what: "구직을 단념한 청년에게 사회 진입 프로그램과 참여수당을 줘요.",
    target:
      "만 18~34세. 신청 전 6개월 이상 취업·창업·교육·직업훈련 이력이 없고 구직단념청년 문답표 21점 이상(30점 만점). 대학(원)생, 휴학생, 개인사업자는 제외해요.",
    age: [18, 34],
    residence: "any",
    income: null,
    start: "지역 운영기관(예: 자치구 서울청년센터)이 기수별로 모집해요. 고용24나 기관 신청서로 신청해요.",
    hours: "운영기관마다 다름",
    contacts: [{ label: "고용노동부 고객상담센터", tel: "1350" }],
    url: { label: "고용24", href: "https://www.work24.go.kr" },
    status: { kind: "rounds", text: "기수마다 마감이 달라 신청 전에 운영기관 공고를 확인해야 해요." },
    note: "금액은 운영기관마다 달라요. 양천구 중기 과정(15주)은 참여수당 150만 원과 인센티브 최대 70만 원이에요.",
    situations: [6],
    sources: [20, 11],
  },
  {
    id: "s15",
    name: "서울 청년수당",
    org: "서울특별시",
    category: "job",
    what: "월 50만 원을 최대 6개월 줘요. 멘토링, 취업 특강, 기업 탐방이 함께 있어요.",
    target: "서울 거주 만 19~34세, 졸업 뒤 미취업이거나 단기 근로, 중위소득 150% 이하",
    age: [19, 34],
    residence: "seoul",
    income: "중위소득 150% 이하",
    start: "청년몽땅정보통에서 온라인으로만 신청해요.",
    hours: "청년몽땅정보통 온라인",
    contacts: [],
    url: { label: "청년몽땅정보통", href: "https://youth.seoul.go.kr" },
    status: {
      kind: "closed",
      text: "2026년 1차(3월 6~13일, 2만 명)와 추가 모집(5월 27~29일, 6,000명 내외)이 끝났어요.",
      next: "다음 모집은 청년몽땅정보통 알림으로 확인해요.",
    },
    note: "2026년 추가 모집에서 고립·은둔 청년을 우선 지원했어요.",
    situations: [6],
    sources: [12],
  },

  // ───── 3-6. 가족돌봄 ─────
  {
    id: "s16",
    name: "청년미래센터 자기돌봄비",
    org: "서울시복지재단 가족돌봄청년지원팀",
    category: "life",
    what: "가족을 돌보는 청년이 자신을 돌보는 데 쓰도록 1인당 200만 원을 한 번 줘요.",
    target: "서울 거주 만 13~34세 가족돌봄청년, 기준 중위소득 100% 이하",
    age: [13, 34],
    residence: "seoul",
    income: "기준 중위소득 100% 이하",
    start: "서울복지포털 → 복지서비스 신청 → 가족돌봄청년 지원 → 청년미래센터 자기돌봄비. 서울복지포털에 가족돌봄 정보를 먼저 등록해요.",
    hours: "서울복지포털 온라인",
    contacts: [],
    url: { label: "서울복지포털", href: "https://wis.seoul.go.kr" },
    status: { kind: "always", text: "2026년 10월 1일부터 상시 접수(올해 140명)" },
    note: "서울특별시 청년미래센터는 11월에 정식 개소할 예정이에요. 서울형 자기돌봄비와는 대상·금액이 다른 별개 사업이에요.",
    situations: [7],
    sources: [13],
  },
  {
    id: "s17",
    name: "서울형 자기돌봄비",
    org: "서울특별시",
    category: "life",
    what: "가족돌봄청년에게 월 30만 원을 줘요.",
    target: "9~39세 가족돌봄청년",
    age: [9, 39],
    residence: "seoul",
    income: null,
    start: "서울복지포털에서 신청해요.",
    hours: "서울복지포털 온라인",
    contacts: [],
    url: { label: "서울복지포털", href: "https://wis.seoul.go.kr" },
    status: {
      kind: "closed",
      text: "2026년 1·2차 모집이 끝났어요.",
      next: "지금은 청년미래센터 자기돌봄비가 상시 접수 중이에요.",
    },
    note: "청년미래센터 자기돌봄비와 대상·금액이 다른 별개 사업이에요.",
    situations: [7],
    sources: [13, 18],
  },

  // ───── 3-7. 생계와 일반 문의 ─────
  {
    id: "s18",
    name: "긴급복지지원",
    org: "보건복지부·사는 곳 자치구",
    category: "life",
    what: "갑작스러운 위기에 생계비 등을 먼저 주고 나중에 소득·재산을 조사해요.",
    target: "주 소득자의 사망·가출 등으로 소득을 잃었거나, 중한 질병·부상, 가족에게서 받은 학대·방임 등 위기 사유가 있는 가구",
    age: null,
    residence: "any",
    income: null,
    start: "129 보건복지상담센터(24시간)에 전화하거나 사는 곳 동주민센터·구청에 가요.",
    hours: "129는 24시간",
    contacts: [{ label: "보건복지상담센터", tel: "129" }],
    url: { label: "복지로 긴급복지지원", href: "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1306220_1118.html" },
    status: { kind: "always", text: "상시" },
    situations: [8],
    sources: [15, 19],
  },
  {
    id: "s19",
    name: "120다산콜",
    org: "서울특별시",
    category: "life",
    what: "서울시 행정 전반을 안내해요. 어디에 물어야 할지 모를 때 먼저 걸 수 있어요.",
    target: "누구나",
    age: null,
    residence: "any",
    income: null,
    start: "02-120으로 전화해요.",
    hours: "365일 24시간(서울시 누리집 대표전화 안내)",
    contacts: [{ label: "120다산콜", tel: "02-120" }],
    status: { kind: "always", text: "상시" },
    note: "서울청년기지개센터 안내문에도 대표 문의처로 적혀 있어요.",
    situations: [8, 9],
    sources: [2],
  },
  {
    id: "s20",
    name: "청년몽땅정보통",
    org: "서울특별시",
    category: "housing",
    what: "서울시 청년 정책을 모아 안내하고 온라인 신청을 받는 누리집이에요. 일자리, 주거(청년월세 지원, 주거비 지원 등), 금융복지 메뉴가 있어요.",
    target: "누구나(정책마다 대상이 달라요)",
    age: null,
    residence: "any",
    income: null,
    start: "누리집에서 분야 메뉴를 고르거나 정책 이름으로 찾아요. 신청하려면 로그인해요.",
    hours: "온라인 상시",
    contacts: [{ label: "120다산콜", tel: "02-120" }],
    url: { label: "청년몽땅정보통", href: "https://youth.seoul.go.kr" },
    status: { kind: "always", text: "상시" },
    note: "서울청년기지개센터, 서울 청년수당, 서울 청년 마음건강 지원사업도 여기서 신청해요.",
    situations: [9],
    sources: [2],
  },
];

export function serviceOf(id: string) {
  return SERVICES.find((s) => s.id === id);
}

export function servicesIn(category: CategorySlug) {
  return SERVICES.filter((s) => s.category === category);
}

/** 추천에 쓸 수 있는지(모집 기간 밖 사업은 뺀다) */
export function recommendable(s: Service) {
  return s.status.kind !== "closed";
}
