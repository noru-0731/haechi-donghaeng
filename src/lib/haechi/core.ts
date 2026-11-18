// 해치 AI 호출(서버에서만). 라우트(app/api/haechi)와 시험 스크립트(scripts/run-eval.ts)가 같이 쓴다.
// client.messages.parse + zodOutputFormat으로 답 형식을 고정하고, 카드에 쓸 값은 서버가 다시 거른다.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { SERVICES, recommendable, serviceOf } from "@/data/services";
import { hasCrisisWords } from "./crisis";
import { SYSTEM_PROMPT } from "./prompt";
import { CRISIS_TEXT, crisisReply, limitReply } from "./scripts";
import {
  LIMITS,
  POSES,
  STAGES,
  TARGETS,
  type ChatTurn,
  type HaechiReply,
  type HaechiRequest,
  type HaechiResponse,
  type PageInfo,
  type Target,
} from "./types";

export const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 800;

const SERVICE_IDS = SERVICES.map((s) => s.id) as [string, ...string[]];

const ReplySchema = z.object({
  reply: z.string(),
  pose: z.enum(POSES),
  stage: z.enum(STAGES),
  chips: z.array(z.string()),
  point_to: z.enum(TARGETS),
  ask_consent: z.boolean(),
  memo: z.array(z.object({ label: z.string(), value: z.string() })),
  profile: z.object({ age: z.number().int().nullable(), lives_in_seoul: z.boolean().nullable() }),
  recommend: z.array(z.object({ id: z.enum(SERVICE_IDS), reason: z.string() })),
  crisis: z.boolean(),
  summary: z.string(),
});

const FORMAT = zodOutputFormat(ReplySchema);

let client: Anthropic | null = null;
function getClient() {
  // 키는 서버 환경변수(ANTHROPIC_API_KEY)에서만 읽는다. 브라우저로 보내지 않는다.
  if (!client) client = new Anthropic({ maxRetries: 1, timeout: 20_000 });
  return client;
}

const SYSTEM: Anthropic.TextBlockParam[] = [
  { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral", ttl: "1h" } },
];
const COMMON = {
  model: MODEL,
  system: SYSTEM,
  thinking: { type: "disabled" as const },
  output_config: { effort: "low" as const, format: FORMAT },
};

function pageNote(page: PageInfo) {
  const targets = page.targets.filter((t) => (TARGETS as readonly string[]).includes(t));
  return `[화면 정보] 지금 쪽: ${page.path}${page.title ? ` (${page.title})` : ""}. 이 쪽에서 가리킬 수 있는 대상: ${
    targets.length ? targets.join(", ") : "없음"
  }.`;
}

/** 지난 해치 답은 모델이 이어받을 칸만 JSON으로 다시 넣는다 */
function assistantText(out: HaechiReply) {
  return JSON.stringify({
    reply: out.reply,
    stage: out.stage,
    ask_consent: out.ask_consent,
    point_to: out.point_to,
    memo: out.memo,
    profile: out.profile,
    recommend: out.recommend.map((r) => r.id),
    crisis: out.crisis,
  });
}

export function toMessages(turns: ChatTurn[], page: PageInfo): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = turns.map((t) =>
    t.role === "user" ? { role: "user", content: t.text } : { role: "assistant", content: assistantText(t.out) },
  );
  const last = msgs[msgs.length - 1];
  if (last && last.role === "user" && typeof last.content === "string") {
    last.content = [
      { type: "text", text: pageNote(page) },
      { type: "text", text: last.content },
    ];
  }
  return msgs;
}

/** 브라우저가 돌려보낸 지난 답의 크기를 줄인다(긴 가짜 답으로 입력을 키우지 못하게) */
function clampReply(r: z.infer<typeof ReplySchema>): HaechiReply {
  return {
    ...r,
    reply: r.reply.slice(0, 400),
    chips: r.chips.slice(0, 4).map((c) => c.slice(0, 24)),
    memo: r.memo.slice(0, 10).map((m) => ({ label: m.label.slice(0, 20), value: m.value.slice(0, 60) })),
    recommend: r.recommend.slice(0, 3).map((x) => ({ id: x.id, reason: x.reason.slice(0, 200) })),
    summary: r.summary.slice(0, 600),
  };
}

/** 요청 모양 검사. 잘못되면 null */
export function checkRequest(body: unknown): HaechiRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const page = b.page as PageInfo | undefined;
  if (!page || typeof page.path !== "string" || !Array.isArray(page.targets)) return null;
  const cleanPage: PageInfo = {
    path: page.path.slice(0, 120),
    title: typeof page.title === "string" ? page.title.slice(0, 80) : "",
    targets: page.targets.filter((t): t is string => typeof t === "string").slice(0, 40),
  };
  if (b.warm === true) return { turns: [], page: cleanPage, warm: true };
  if (!Array.isArray(b.turns) || b.turns.length === 0 || b.turns.length > LIMITS.turns * 2 + 2) return null;
  const turns: ChatTurn[] = [];
  for (const t of b.turns as Record<string, unknown>[]) {
    if (t?.role === "user" && typeof t.text === "string" && t.text.trim()) {
      turns.push({ role: "user", text: t.text.slice(0, LIMITS.inputChars) });
    } else if (t?.role === "assistant" && t.out && typeof t.out === "object") {
      const parsed = ReplySchema.safeParse(t.out);
      if (!parsed.success) return null;
      turns.push({ role: "assistant", out: clampReply(parsed.data) });
    } else return null;
  }
  if (turns[turns.length - 1].role !== "user") return null;
  return { turns, page: cleanPage };
}

export function userTurnCount(turns: ChatTurn[]) {
  return turns.filter((t) => t.role === "user").length;
}

/** 모델 답을 화면에 내보내기 전에 다듬는다. 목록 밖 번호, 모집 끝난 사업, 조건 밖 사업은 뺀다 */
export function tidy(raw: z.infer<typeof ReplySchema>, lastUserText: string, page: PageInfo): HaechiReply {
  const crisis = raw.crisis || hasCrisisWords(lastUserText);
  const { age, lives_in_seoul } = raw.profile;
  const seen = new Set<string>();
  const recommend = crisis
    ? []
    : raw.recommend
        .filter((r) => {
          const s = serviceOf(r.id);
          if (!s || s.crisis || !recommendable(s) || seen.has(r.id)) return false;
          if (age !== null && s.age && (age < s.age[0] || age > s.age[1])) return false;
          if (lives_in_seoul === false && s.residence !== "any") return false;
          seen.add(r.id);
          return true;
        })
        .slice(0, 3)
        .map((r) => ({ id: r.id, reason: r.reason.slice(0, 200) }));
  const targets = new Set(page.targets);
  let point: Target = raw.point_to !== "none" && targets.has(raw.point_to) ? raw.point_to : "none";
  // 추천했는데 가리킬 곳을 비웠으면 첫 추천 서비스의 상세 쪽 신청 칸(그 쪽에 있을 때)이나 분야 메뉴를 가리킨다
  if (point === "none" && recommend.length) {
    const s = serviceOf(recommend[0].id);
    const here = page.path === `/services/${recommend[0].id}` && targets.has("detail-apply") ? "detail-apply" : null;
    const menu = s ? `menu-${s.category}` : null;
    if (here) point = here;
    else if (menu && targets.has(menu)) point = menu as Target;
  }
  // 낱말로만 위기가 잡히고 모델은 일반 안내를 했으면, 말을 정해 둔 위기 안내로 바꾼다
  const reply = crisis && !raw.crisis ? CRISIS_TEXT : raw.reply.slice(0, 400);
  // 요약 카드는 추천·마무리 답에서만 띄운다. 다른 단계에서 모델이 채운 글이나 "}" 같은 토막은 버린다
  const draft = raw.summary.trim();
  const summaryOk = !crisis && (raw.stage === "recommend" || raw.stage === "closing") && draft.length >= 10;
  return {
    reply,
    pose: crisis ? "worry" : raw.pose,
    stage: crisis ? "crisis" : raw.stage,
    // 위기·자해·죽음과 이어진 말은 누르는 선택지로 내놓지 않는다(이용자가 한 번 눌러 그런 말을 하게 되므로)
    chips: (crisis ? [] : raw.chips)
      .map((c) => c.trim())
      .filter((c) => c && !hasCrisisWords(c) && !/죽|자해|자살|사라지|해치려|위험해|그만두고 싶/.test(c))
      .slice(0, 4)
      .map((c) => c.slice(0, 24)),
    point_to: crisis ? "none" : point,
    ask_consent: crisis ? false : raw.ask_consent,
    memo: raw.memo
      .filter((m) => !/허락|동의|의사 확인/.test(m.label))
      .slice(0, 10)
      .map((m) => ({ label: m.label.slice(0, 20), value: m.value.slice(0, 60) })),
    profile: raw.profile,
    recommend,
    crisis,
    summary: summaryOk ? draft.slice(0, 600) : "",
  };
}

/** 의사 확인 안전장치: 바로 앞 답에서 지원 안내를 원하는지 묻지 않았는데 나이·사는 곳을 묻는 단계(explore)가 나오면
 *  그 답을 의사 확인 질문으로 바꾼다. 모델이 마음을 되물은 뒤 이용자의 "네"를 허락으로 읽는 일이 세 번에 한 번꼴 남아 넣었다 */
const CONSENT_TEXT = "말해 줘서 고마워요. 혹시 이럴 때 도움받을 수 있는 서울시 지원도 같이 알아볼래요? 원하지 않으면 이야기만 나눠도 돼요.";
export function guardConsent(out: HaechiReply, prev: HaechiReply | null): HaechiReply {
  if (out.stage !== "explore") return out;
  if (prev && (prev.ask_consent || prev.stage === "consent" || prev.stage === "explore")) return out;
  return {
    ...out,
    reply: CONSENT_TEXT,
    pose: "wink",
    stage: "consent",
    ask_consent: true,
    chips: ["네, 알아볼래요", "지금은 괜찮아요"],
    recommend: [],
    point_to: "none",
    summary: "",
  };
}

/** 첫 대화 전에 시스템 프롬프트 캐시를 미리 써 둔다(같은 설정, 아주 짧은 답) */
let warmedAt = 0;
export async function warm(): Promise<void> {
  if (Date.now() - warmedAt < 50 * 60 * 1000) return;
  warmedAt = Date.now();
  try {
    await getClient().messages.create({
      ...COMMON,
      max_tokens: 1,
      messages: [{ role: "user", content: "준비" }],
    });
  } catch {
    warmedAt = 0;
  }
}

export async function askHaechi(req: HaechiRequest): Promise<HaechiResponse> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "no_key" };
  if (userTurnCount(req.turns) > LIMITS.turns) {
    const last = req.turns[req.turns.length - 1];
    const out = last.role === "user" && hasCrisisWords(last.text) ? crisisReply() : limitReply();
    return { ok: true, out, meta: { ms: 0, usage: { input: 0, output: 0, cache_read: 0, cache_write: 0 }, stop: null } };
  }
  const t0 = Date.now();
  try {
    const res = await getClient().messages.parse({
      ...COMMON,
      max_tokens: MAX_TOKENS,
      messages: toMessages(req.turns, req.page),
    });
    if (res.stop_reason === "refusal") return { ok: false, error: "refusal" };
    if (!res.parsed_output) return { ok: false, error: "parse" };
    const last = req.turns[req.turns.length - 1];
    const lastText = last.role === "user" ? last.text : "";
    const prev = [...req.turns].reverse().find((t): t is Extract<ChatTurn, { role: "assistant" }> => t.role === "assistant")?.out ?? null;
    return {
      ok: true,
      out: guardConsent(tidy(res.parsed_output, lastText, req.page), prev),
      meta: {
        ms: Date.now() - t0,
        usage: {
          input: res.usage.input_tokens,
          output: res.usage.output_tokens,
          cache_read: res.usage.cache_read_input_tokens ?? 0,
          cache_write: res.usage.cache_creation_input_tokens ?? 0,
        },
        stop: res.stop_reason,
      },
    };
  } catch (error) {
    // SDK 오류 종류별로 나눈다(구체적인 것부터). 화면은 어느 경우든 대본 흐름으로 이어 간다.
    if (error instanceof Anthropic.BadRequestError) return { ok: false, error: "bad_request" };
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "auth" };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "rate_limit" };
    if (error instanceof Anthropic.APIConnectionError) return { ok: false, error: "connection" };
    if (error instanceof Anthropic.APIError) return { ok: false, error: "api" };
    return { ok: false, error: "parse" };
  }
}
