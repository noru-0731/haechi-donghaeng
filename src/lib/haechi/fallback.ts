// 대본 흐름. AI 연결이 실패했을 때 화면이 끊기지 않게 낱말 규칙으로 답을 만든다(계획서 6·9단계).
// AI 답과 같은 모양(HaechiReply)을 돌려준다. 브라우저에서 돈다.
import { hasCrisisWords } from "./crisis";
import { crisisReply } from "./scripts";
import type { ChatTurn, HaechiReply, MemoItem, Recommend, Target } from "./types";

const has = (t: string, words: string[]) => words.some((w) => t.replace(/\s+/g, "").includes(w.replace(/\s+/g, "")));

const YES = ["네", "응", "좋아요", "물어봐", "알아볼", "괜찮아요물어", "그래요", "예"];
const NO = ["아니", "싫어", "지금은괜찮", "나중에", "됐어요"];
const ISOLATION = ["밖에안", "밖에잘안", "안나가", "안 나가", "집에만", "집에서만", "방에만", "사람안만", "사람을안만", "연락이끊", "연락끊", "혼자지내", "아무도안만", "외출"];

function base(over: Partial<HaechiReply>): HaechiReply {
  return {
    reply: "",
    pose: "listen",
    stage: "general",
    chips: [],
    point_to: "none",
    ask_consent: false,
    memo: [],
    profile: { age: null, lives_in_seoul: null },
    recommend: [],
    crisis: false,
    summary: "",
    ...over,
  };
}

function lastOut(turns: ChatTurn[]): HaechiReply | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.role === "assistant") return t.out;
  }
  return null;
}

function addMemo(memo: MemoItem[], label: string, value: string) {
  return [...memo.filter((m) => m.label !== label), { label, value }];
}

const TENS: [string, number][] = [
  ["예순", 60],
  ["쉰", 50],
  ["마흔", 40],
  ["서른", 30],
  ["스물", 20],
  ["열", 10],
];
const ONES: [string, number][] = [
  ["하나", 1],
  ["한", 1],
  ["둘", 2],
  ["두", 2],
  ["셋", 3],
  ["세", 3],
  ["넷", 4],
  ["네", 4],
  ["다섯", 5],
  ["여섯", 6],
  ["일곱", 7],
  ["여덟", 8],
  ["아홉", 9],
];

/** "27살", "스물일곱", "30대 초반" 같은 말에서 나이를 어림한다 */
function ageOf(text: string): number | null {
  const m = text.match(/(\d{2})\s*(살|세)/) ?? text.match(/\b(\d{2})\b/);
  if (m) return Number(m[1]);
  for (const [w, n] of TENS) {
    const i = text.indexOf(w);
    if (i < 0) continue;
    const rest = text.slice(i + w.length, i + w.length + 2);
    const one = ONES.find(([u]) => rest.startsWith(u));
    if (one) return n + one[1];
    return n + (text.includes("후반") ? 7 : text.includes("중반") ? 5 : 2);
  }
  const dec = text.match(/(\d)0\s*대/);
  if (dec) return Number(dec[1]) * 10 + (text.includes("후반") ? 7 : text.includes("초반") ? 2 : 5);
  return null;
}

function pick(targets: string[], ...wanted: Target[]): Target {
  return wanted.find((t) => targets.includes(t)) ?? "none";
}

export function fallbackReply(turns: ChatTurn[], targets: string[]): HaechiReply {
  const last = turns[turns.length - 1];
  const text = last && last.role === "user" ? last.text : "";
  const prev = lastOut(turns);
  let memo = prev?.memo ?? [];
  const profile = { ...(prev?.profile ?? { age: null, lives_in_seoul: null }) };

  if (hasCrisisWords(text)) return crisisReply(memo, profile);

  // 의사를 물은 뒤의 답
  if (prev?.stage === "consent") {
    if (has(text, NO)) {
      return base({
        reply: "알겠어요, 더 묻지 않을게요. 누리집에서 찾는 게 있으면 편하게 말해 주세요. 나중에라도 이야기하고 싶으면 언제든 불러 주세요.",
        pose: "hello",
        chips: ["일자리 메뉴", "마음건강 메뉴", "처음으로"],
        memo,
        profile,
      });
    }
    if (has(text, YES)) {
      return base({
        reply: "좋아요. 맞는 곳을 찾으려면 나이대와 서울에 사는지만 알면 돼요. 말하기 싫으면 넘어가도 돼요.",
        pose: "listen",
        stage: "explore",
        chips: ["20대, 서울 살아요", "30대, 서울 살아요", "40대 이상이에요", "서울 밖에 살아요"],
        memo,
        profile,
      });
    }
  }

  if (prev?.stage === "explore") {
    const asked = prev.reply;
    if (asked.includes("얼마나")) {
      if (!has(text, ["넘어"])) memo = addMemo(memo, "그렇게 지낸 기간", text.slice(0, 20));
      return base({
        reply: "알려 줘서 고마워요. 맞는 곳을 찾으려면 나이대와 서울에 사는지만 알면 돼요. 말하기 싫으면 넘어가도 돼요.",
        stage: "explore",
        chips: ["20대, 서울 살아요", "30대, 서울 살아요", "40대 이상이에요", "서울 밖에 살아요"],
        memo,
        profile,
      });
    }
    const age = ageOf(text);
    if (age !== null) {
      profile.age = age;
      memo = addMemo(memo, "나이", `${age}세 안팎`);
    }
    if (has(text, ["서울밖", "경기", "인천", "부산", "대구", "대전", "광주", "지방"])) profile.lives_in_seoul = false;
    else if (has(text, ["서울"])) profile.lives_in_seoul = true;
    if (profile.lives_in_seoul !== null) memo = addMemo(memo, "사는 곳", profile.lives_in_seoul ? "서울" : "서울 밖");
    let recommend: Recommend[];
    let reply: string;
    if (profile.lives_in_seoul === false) {
      recommend = [];
      reply =
        "서울시 사업은 서울에 사는 사람이 대상이라 바로 이어 주기 어려워요. 사는 시도의 청년 지원 창구를 알아보면 좋고, 힘들 때는 109나 1577-0199도 전국 어디서나 받아요.";
    } else if (profile.age !== null && profile.age >= 40) {
      recommend = [
        { id: "s12", reason: "40~64세 고립 지원을 맡는 곳이라 나이 조건에 맞아요." },
        { id: "s08", reason: "서울 시민이면 나이 제한 없이 24시간 이야기할 수 있어요." },
      ];
      reply = "이야기해 준 걸 보면 서울잇다플레이스가 맞을 것 같아요. 먼저 전화로 물어봐도 되고, 외로움안녕120도 언제든 받아요.";
    } else {
      recommend = [
        { id: "s11", reason: "서울에 사는 청년(19~39세)이고 오래 집에서 지냈다고 해서 이 센터의 지원과 맞아 보여요." },
        { id: "s08", reason: "신청 전에 사람과 먼저 이야기해 보고 싶을 때 24시간 받는 전화예요." },
      ];
      reply = "이야기해 준 걸 보면 서울청년기지개센터가 맞을 것 같아요. 신청은 청년몽땅정보통에서 하고, 대상인지 헷갈리면 센터에 먼저 물어봐도 돼요.";
    }
    const facts = memo.map((m) => `${m.label}은 ${m.value}`).join(", ");
    return base({
      reply,
      pose: "cheer",
      stage: "recommend",
      recommend,
      memo,
      profile,
      point_to: pick(targets, "detail-apply", "menu-relation"),
      summary: recommend.length
        ? `요즘 거의 집에서 지내고 있어 도움을 알아보고 있습니다. ${facts ? facts + "입니다. " : ""}${recommend[0].id === "s11" ? "서울청년기지개센터" : "서울잇다플레이스"} 이용 방법을 알고 싶습니다.`
        : "",
    });
  }

  if (has(text, ISOLATION)) {
    memo = addMemo(memo, "요즘 생활", "밖에 거의 나가지 않음");
    return base({
      reply: "그렇게 지내느라 많이 지치셨겠어요. 혹시 이럴 때 도움받을 수 있는 서울시 지원도 같이 알아볼래요? 원하지 않으면 이야기만 나눠도 돼요.",
      pose: "wink",
      stage: "consent",
      ask_consent: true,
      chips: ["네, 알아볼래요", "지금은 괜찮아요"],
      memo,
      profile,
    });
  }

  if (has(text, ["월세", "주거", "집구", "전세", "임대"])) {
    memo = addMemo(memo, "찾는 것", "주거 지원");
    return base({
      reply: "청년 월세 같은 주거 지원은 위쪽 주거 메뉴에 모아 두었어요. 모집 공고는 청년몽땅정보통의 주거 메뉴에서 보고, 헷갈리면 120다산콜에 물어보면 돼요.",
      pose: "point",
      point_to: pick(targets, "menu-housing", "tile-housing"),
      recommend: [
        { id: "s20", reason: "청년월세 지원이 있는 주거 메뉴에서 모집 공고를 볼 수 있어요." },
        { id: "s19", reason: "어느 사업이 맞는지 모를 때 물어볼 수 있는 서울시 안내 전화예요." },
      ],
      chips: ["신청은 어떻게 해요?", "다른 것도 볼래요"],
      memo,
      profile,
    });
  }
  if (has(text, ["청년수당"])) {
    return base({
      reply: "서울 청년수당은 올해 모집이 끝났어요. 다음 모집은 청년몽땅정보통 알림으로 확인하고, 지금 바로 할 수 있는 건 일자리 메뉴의 청년도전지원사업이에요.",
      pose: "idea",
      point_to: pick(targets, "menu-job", "tile-job"),
      recommend: [{ id: "s20", reason: "다음 청년수당 모집 알림을 받을 수 있는 누리집이에요." }],
      memo,
      profile,
    });
  }
  if (has(text, ["일자리", "취업", "구직", "일하", "일을", "진로", "알바"])) {
    memo = addMemo(memo, "찾는 것", "일자리");
    return base({
      reply: "일자리 지원은 위쪽 일자리 메뉴에 있어요. 오래 쉬다 다시 시작하려는 청년에게는 청년도전지원사업이 있고, 모집은 운영기관마다 기수별로 해요.",
      pose: "point",
      point_to: pick(targets, "menu-job", "tile-job"),
      recommend: [{ id: "s14", reason: "다시 일을 시작하려는 18~34세 청년을 위한 사업이에요." }],
      chips: ["조건이 어떻게 돼요?", "다른 것도 볼래요"],
      memo,
      profile,
    });
  }
  if (has(text, ["우울", "불안", "잠이", "불면", "상담", "마음이힘", "마음이 힘"])) {
    memo = addMemo(memo, "찾는 것", "마음 상담");
    return base({
      reply: "마음이 힘들 때 이어 줄 곳은 마음건강 메뉴에 모았어요. 사는 자치구의 정신건강복지센터는 무료이고 상시로 상담받을 수 있어요.",
      pose: "point",
      point_to: pick(targets, "menu-mind", "tile-mind"),
      recommend: [{ id: "s05", reason: "무료로 상담과 검사를 받을 수 있는 상시 창구예요." }],
      chips: ["어떻게 신청해요?", "다른 것도 볼래요"],
      memo,
      profile,
    });
  }
  if (has(text, ["외로", "얘기할사람", "이야기할사람", "심심"])) {
    return base({
      reply: "지금 누군가와 이야기하고 싶다면 외로움안녕120이 24시간 받아요. 120에 전화한 뒤 5번을 누르면 상담사와 이어져요.",
      pose: "idea",
      point_to: pick(targets, "menu-relation", "tile-relation"),
      recommend: [{ id: "s08", reason: "외로울 때 바로 전화로 이야기할 수 있는 서울시 창구예요." }],
      memo,
      profile,
    });
  }
  if (has(text, ["가족", "돌보", "간병"])) {
    return base({
      reply: "가족을 돌보느라 자기 생활이 없는 청년을 위한 자기돌봄비가 10월부터 상시 접수 중이에요. 생활·위기 메뉴에서 조건을 볼 수 있어요.",
      pose: "point",
      point_to: pick(targets, "menu-life", "tile-life"),
      recommend: [{ id: "s16", reason: "가족을 돌보는 13~34세 청년이 신청할 수 있어요." }],
      memo,
      profile,
    });
  }
  if (has(text, ["생계", "끼니", "돈이없", "병원비", "월급"])) {
    return base({
      reply: "당장 생계가 막혔다면 129 보건복지상담센터에 전화하거나 사는 곳 동주민센터에 가면 긴급복지를 알아볼 수 있어요.",
      pose: "point",
      point_to: pick(targets, "menu-life", "tile-life"),
      recommend: [{ id: "s18", reason: "갑작스러운 위기에 생계비를 먼저 지원하는 제도예요." }],
      memo,
      profile,
    });
  }
  if (has(text, ["조건", "자격", "대상인지", "대상이"])) {
    return base({
      reply: "신청 조건은 각 서비스 상세 쪽의 대상 조건 칸에 적혀 있어요. 첫 화면의 많이 찾는 지원이나 분야 메뉴에서 서비스를 고르면 볼 수 있어요.",
      pose: "point",
      point_to: pick(targets, "detail-target", "popular", "menu-relation"),
      chips: ["많이 찾는 지원 보기", "다른 것도 볼래요"],
      memo,
      profile,
    });
  }
  if (has(text, ["글자", "크게", "어둡", "화면"])) {
    return base({
      reply: "오른쪽 위의 글자·화면 설정 단추에서 글자 크기와 화면 밝기를 바꿀 수 있어요.",
      pose: "point",
      point_to: pick(targets, "settings"),
      memo,
      profile,
    });
  }
  return base({
    reply: "제가 잘 이해했는지 모르겠어요. 아래에서 찾는 분야를 고르거나, 궁금한 걸 한 번 더 말해 주세요.",
    pose: "search",
    chips: ["일자리", "주거", "마음이 좀 힘들어요", "그냥 둘러보는 중"],
    memo,
    profile,
  });
}
