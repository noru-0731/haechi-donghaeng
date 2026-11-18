// 해치 AI 경로. 서버에서만 실행되고 키는 서버 환경변수에만 있다.
// 대화는 저장하거나 기록하지 않는다. 브라우저가 매번 지금까지의 대화를 보내고, 서버는 답만 돌려준다.
import { askHaechi, checkRequest, warm } from "@/lib/haechi/core";
import type { HaechiResponse } from "@/lib/haechi/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY = 120_000; // 바이트. 한글 대화 20턴과 지난 답을 넉넉히 담는 크기

function json(body: HaechiResponse | { ok: true; warmed: true }, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return json({ ok: false, error: "bad_request" }, 413);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json({ ok: false, error: "bad_request" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const req = checkRequest(body);
  if (!req) return json({ ok: false, error: "bad_request" }, 400);

  if (req.warm) {
    if (process.env.ANTHROPIC_API_KEY) await warm();
    return json({ ok: true, warmed: true });
  }

  const res = await askHaechi(req);
  if (res.ok) return json(res);
  const status = res.error === "rate_limit" ? 429 : res.error === "bad_request" ? 400 : 503;
  return json(res, status);
}
