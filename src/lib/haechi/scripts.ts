// 정해 둔 해치 말(API를 부르지 않는 것): 대화 첫마디, 대화 상한 마무리, 시연 장면 대사.
import type { HaechiReply, MemoItem } from "./types";

const EMPTY = {
  point_to: "none" as const,
  ask_consent: false,
  memo: [],
  profile: { age: null, lives_in_seoul: null },
  recommend: [],
  crisis: false,
  summary: "",
};

export const GREETING = "안녕하세요, 저는 해치예요. 이 누리집에서 찾는 게 있으면 같이 찾아볼까요?";
export const EXPLAIN =
  "저는 세 가지를 해요. 이 누리집에서 메뉴와 신청 방법을 짚어 주고, 짧은 대화로 필요한 도움을 알아보고, 맞는 기존 서비스로 이어 줘요. 답하기 싫은 건 넘어가도 돼요.";

export const OPENER: HaechiReply = {
  ...EMPTY,
  reply: "좋아요. 오늘은 어떤 걸 찾으러 왔어요? 요즘 고민을 편하게 말해도 되고, 아래에서 골라도 돼요.",
  pose: "search",
  stage: "general",
  chips: ["청년 월세 지원", "취업 준비가 막막해요", "사람 만나는 게 부담돼요", "그냥 둘러보는 중"],
};

/** 대화창 입력줄의 '메뉴' 단추에 모아 둔 말 예시. 누르면 그 말을 바로 보낸다 */
export const STARTERS: { title: string; lines: string[] }[] = [
  {
    title: "요즘 고민을 이렇게 말해 봐도 돼요",
    lines: [
      "요즘 취업 준비가 너무 막막해요",
      "월세 때문에 고민이 많아요",
      "사람 만나는 게 점점 부담스러워져요",
      "집에만 있다 보니 뭘 해야 할지 모르겠어요",
      "요즘 이야기할 사람이 없어요",
    ],
  },
  { title: "누리집 이용", lines: ["청년 월세는 어디서 신청해요?", "글자를 크게 보고 싶어요"] },
];

export const CRISIS_TEXT =
  "그런 마음이 들 만큼 많이 힘들었군요. 지금 바로 자살예방상담전화 109나 정신건강위기상담전화 1577-0199에 전화해 주세요. 둘 다 24시간 받고, 당장 위험하면 119나 112예요.";

/** 위기 답. 다른 안내, 선택지, 요약 없이 연락처만 앞세운다 */
export function crisisReply(memo: MemoItem[] = [], profile: HaechiReply["profile"] = { age: null, lives_in_seoul: null }): HaechiReply {
  return { ...EMPTY, reply: CRISIS_TEXT, pose: "worry", stage: "crisis", chips: [], crisis: true, memo, profile };
}

/** 대화 상한(20턴)을 넘었을 때. 기지개센터와 120다산콜 연락처를 카드로 보여 준다 */
export function limitReply(): HaechiReply {
  return {
    ...EMPTY,
    reply:
      "오늘은 이야기를 많이 나눠서 여기서 마무리할게요. 더 궁금한 건 서울청년기지개센터(02-6953-2520)나 120다산콜(02-120)에 물어보면 사람이 직접 도와줘요.",
    pose: "hello",
    stage: "closing",
    chips: [],
    recommend: [
      { id: "s11", reason: "대상인지 헷갈리거나 신청하다 막힐 때 먼저 물어볼 수 있는 곳이에요." },
      { id: "s19", reason: "어디에 물어야 할지 모를 때 24시간 받는 서울시 안내 전화예요." },
    ],
  };
}

/** 시연 장면(주소 끝 #demo1, #demo2). 이용자 말만 정해 두고 해치 답은 실제 AI가 한다 */
export const DEMOS: Record<string, { title: string; start: string; lines: string[] }> = {
  "#demo1": {
    title: "장면 1. 일반 시민의 정보 탐색",
    start: "/",
    lines: ["청년 월세 지원은 어디서 신청해요?", "신청 조건은 어디서 봐요?", "고마워요, 글자도 좀 크게 보고 싶어요"],
  },
  "#demo2": {
    title: "장면 2. 고립·은둔 청년의 지원 연결",
    start: "/",
    lines: [
      "일자리 메뉴 어디 있어요?",
      "사실 요즘 거의 밖에 안 나가서 일 구하는 것도 엄두가 안 나요",
      "네, 알아볼래요",
      "스물일곱이고 서울 살아요",
    ],
  },
};
