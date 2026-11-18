// 해치 층과 AI 경로가 함께 쓰는 이름과 타입. zod를 쓰지 않아 브라우저 묶음에 넣어도 가볍다.

export const POSES = ["hello", "listen", "wink", "worry", "point", "cheer", "idea", "search"] as const;
export type Pose = (typeof POSES)[number];

/** 포즈별 그림 크기(화소). 4배 업스케일 그림(scripts/upscale-haechi.py)이고 화면에는 절반 이하로 보인다 */
export const POSE_SIZE: Record<Pose, [number, number]> = {
  hello: [591, 543],
  listen: [399, 523],
  wink: [423, 540],
  worry: [306, 527],
  point: [491, 554],
  cheer: [492, 528],
  idea: [405, 640],
  search: [470, 552],
};

/** 해치가 가리킬 수 있는 대상(data-haechi-target 이름). none은 가리키지 않음 */
export const TARGETS = [
  "none",
  "home",
  "search",
  "settings",
  "menu-job",
  "menu-housing",
  "menu-mind",
  "menu-relation",
  "menu-life",
  "menu-guide",
  "tile-job",
  "tile-housing",
  "tile-mind",
  "tile-relation",
  "tile-life",
  "tile-guide",
  "popular",
  "detail-apply",
  "detail-contact",
  "detail-target",
  "detail-source",
] as const;
export type Target = (typeof TARGETS)[number];

/** 대화 단계. explore는 의사를 확인한 뒤의 추가 질문 */
export const STAGES = ["general", "consent", "explore", "recommend", "crisis", "closing"] as const;
export type Stage = (typeof STAGES)[number];

export type MemoItem = { label: string; value: string };
export type Recommend = { id: string; reason: string };

/** AI 답 한 번(서버가 다듬은 뒤) */
export type HaechiReply = {
  reply: string;
  pose: Pose;
  stage: Stage;
  chips: string[];
  point_to: Target;
  ask_consent: boolean;
  memo: MemoItem[];
  profile: { age: number | null; lives_in_seoul: boolean | null };
  recommend: Recommend[];
  crisis: boolean;
  summary: string;
};

export type ChatTurn = { role: "user"; text: string } | { role: "assistant"; out: HaechiReply };

export type PageInfo = { path: string; title: string; targets: string[] };

export type HaechiRequest = { turns: ChatTurn[]; page: PageInfo; warm?: boolean };

export type Usage = { input: number; output: number; cache_read: number; cache_write: number };

export type HaechiResponse =
  | { ok: true; out: HaechiReply; meta: { ms: number; usage: Usage; stop: string | null } }
  | { ok: false; error: "bad_request" | "auth" | "rate_limit" | "connection" | "refusal" | "parse" | "api" | "no_key" | "limit" };

export const LIMITS = { inputChars: 500, turns: 20 } as const;
