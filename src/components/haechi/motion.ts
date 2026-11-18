// 해치 움직임 계산: 걷기·뛰기 궤적과 설 곳 찾기. 화면에 그리는 일은 HaechiLayer가 한다.
// 좌표는 모두 CSS px(글자·화면 설정의 zoom을 나눈 값)이고, 해치 위치는 발밑 가운데(foot)로 다룬다.
// 발밑을 기준으로 두면 포즈마다 그림 폭이 달라도 발이 제 위치에 머문다.

export type XY = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/** 해치가 설 곳. perch는 올라선 칸(스크롤하면 그 칸을 따라간다), edge는 화면 오른쪽 끝에서 빼꼼 내다보는 곳 */
export type Spot = {
  foot: XY;
  kind: "floor" | "perch" | "edge";
  perch?: { el: HTMLElement; dx: number; sticky?: boolean }; // sticky: 대화창처럼 화면 위치와 상관없이 늘 따라갈 칸
  name?: string;
};

export const PERCH_SINK = 3; // 칸 윗변에 발이 살짝 묻히게
export const FLOOR_GAP = 14; // 화면 아래에서 발까지

export const zoomOf = () => (typeof document !== "undefined" ? parseFloat(document.body.style.zoom) || 1 : 1);

/** 보이는 화면 크기. 폭은 세로 스크롤 막대를 뺀 값이다 */
export function viewport() {
  const z = zoomOf();
  return { vw: (document.documentElement.clientWidth || window.innerWidth) / z, vh: window.innerHeight / z };
}

export function rectOf(el: Element): Box {
  const z = zoomOf();
  const r = el.getBoundingClientRect();
  return { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z, width: r.width / z, height: r.height / z };
}

/** 요소 안 글자·그림이 실제로 차지하는 상자(가리키기 테두리용). 머리말 메뉴 단추처럼 단추가 글자보다 훨씬 클 때
 *  단추 테두리 대신 글자 둘레에 맞춘다. 읽기 도구용 글자(1px 상자)는 뺀다. 내용이 없으면 요소 상자를 쓴다 */
export function contentBox(el: Element, pad = 6): Box {
  const z = zoomOf();
  const outer = el.getBoundingClientRect();
  const r = document.createRange();
  r.selectNodeContents(el);
  let l = Infinity,
    t = Infinity,
    rt = -Infinity,
    b = -Infinity;
  for (const x of Array.from(r.getClientRects())) {
    if (x.width <= 2 || x.height <= 2) continue;
    l = Math.min(l, x.left);
    t = Math.min(t, x.top);
    rt = Math.max(rt, x.right);
    b = Math.max(b, x.bottom);
  }
  r.detach();
  if (!Number.isFinite(l)) ({ left: l, top: t, right: rt, bottom: b } = outer);
  // 요소 밖으로 넘친 내용은 요소 상자까지만
  l = Math.max(l, outer.left) - pad;
  t = Math.max(t, outer.top) - pad;
  rt = Math.min(rt, outer.right) + pad;
  b = Math.min(b, outer.bottom) + pad;
  return { left: l / z, top: t / z, right: rt / z, bottom: b / z, width: (rt - l) / z, height: (b - t) / z };
}

/** 고정 머리(시연 띠, 누리집 머리말)의 아랫변. 해치 머리가 이보다 위로 올라가지 않는다 */
export function topLimit() {
  let t = 0;
  for (const sel of [".hd-strip", ".rc-hd"]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = rectOf(el);
    if (r.height > 0 && r.top < 80) t = Math.max(t, r.bottom);
  }
  return t;
}

/** 데스크톱 왼쪽 막대의 오른변 */
export function leftLimit() {
  const el = document.querySelector(".rc-leftbar");
  if (!el) return 0;
  const r = rectOf(el);
  return r.width > 0 && r.left < 4 && r.height > 200 ? r.right : 0;
}

// ───── 궤적 ─────

const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type Tween = {
  kind: "walk" | "jump";
  from: XY;
  to: () => XY; // 올라설 칸이 스크롤로 움직이면 도착점도 따라간다
  t0: number;
  pre: number; // 뛰기 전 웅크리기(ms)
  dur: number; // 옮겨 가는 시간(ms)
  post: number; // 착지해 눌렸다 펴지는 시간(ms)
  arc: number; // 뛰는 높이(px)
  steps: number; // 걷기 발걸음 수
  dir: 1 | -1;
  done: (ok: boolean) => void;
};

/** 옮겨 가는 시간 배율. 혼자 돌아다닐 때는 느긋하게, 가리키기·대화창 옆으로 갈 때처럼 할 일이 있을 때는 조금 빠르게 */
export const PACE = { roam: 4, task: 2.2 } as const;

/** 걷기는 거리에 맞춰 일정한 빠르기로, 뛰기는 거리와 높이 차에 맞춰 포물선 높이를 정한다 */
/** ceil을 주면 뛰는 동안 해치 머리(발 - h)가 그 선(머리말 아랫변) 위로 올라가지 않게 포물선 높이를 줄인다 */
export function makeTween(
  kind: Tween["kind"],
  from: XY,
  to: () => XY,
  now: number,
  done: Tween["done"],
  bound?: { h: number; ceil: number },
  pace: number = PACE.task,
): Tween {
  const end = to();
  const dx = end.x - from.x;
  const dy = end.y - from.y;
  const dist = Math.hypot(dx, dy);
  const dir: 1 | -1 = dx >= 0 ? 1 : -1;
  if (kind === "walk") {
    // 걸음 하나에 260ms쯤 들게 발걸음 수를 시간에 맞춘다(느리게 걸어도 발이 굼뜨지 않게)
    const dur = clamp(dist / 0.17, 450, 3200) * pace;
    return { kind, from, to, t0: now, pre: 0, dur, post: 140, arc: 0, steps: Math.max(2, Math.round(dur / 260)), dir, done };
  }
  // 위로 뛸 때는 높이 차만큼 더 높이, 아래로 뛰어내릴 때는 낮게
  let arc = dy < 0 ? clamp(40 + dist * 0.2 - dy * 0.3, 50, 230) : clamp(28 + dist * 0.12, 30, 110);
  if (bound) arc = Math.max(8, Math.min(arc, Math.min(from.y, end.y) - bound.h - bound.ceil));
  // 뛰기도 배율의 8할만큼 늘인다(10-19 저녁: 뛰어오를 때 순간 속도가 걷기의 몇 배라 빨라 보인다는 의견으로 늘림)
  const dur = clamp(420 + dist * 0.8, 520, 1500) * pace * 0.8;
  return { kind, from, to, t0: now, pre: 130, dur, post: 200, arc, steps: 0, dir, done };
}

export type Frame = { foot: XY; lift: number; tilt: number; sx: number; sy: number; end: boolean };

export function sampleTween(tw: Tween, now: number): Frame {
  const to = tw.to();
  const t = now - tw.t0;
  if (t < tw.pre) {
    const k = Math.sin((Math.PI * t) / tw.pre);
    return { foot: tw.from, lift: 0, tilt: 0, sx: 1 + 0.08 * k, sy: 1 - 0.12 * k, end: false };
  }
  const m = t - tw.pre;
  if (m < tw.dur) {
    const p = m / tw.dur;
    const e = easeInOut(p);
    const x = tw.from.x + (to.x - tw.from.x) * e;
    if (tw.kind === "jump") {
      const y = tw.from.y + (to.y - tw.from.y) * e - tw.arc * 4 * p * (1 - p);
      const k = Math.sin(Math.PI * p);
      return { foot: { x, y }, lift: 0, tilt: tw.dir * 8 * (1 - 2 * p), sx: 1 - 0.05 * k, sy: 1 + 0.07 * k, end: false };
    }
    const y = tw.from.y + (to.y - tw.from.y) * e;
    const env = Math.min(1, p * 5, (1 - p) * 5);
    const ph = Math.PI * tw.steps * p;
    return { foot: { x, y }, lift: Math.abs(Math.sin(ph)) * 7 * env, tilt: Math.sin(ph) * 5 * env, sx: 1, sy: 1, end: false };
  }
  const a = m - tw.dur;
  if (a < tw.post) {
    const k = Math.sin((Math.PI * a) / tw.post) * (tw.kind === "jump" ? 1 : 0.35);
    return { foot: to, lift: 0, tilt: 0, sx: 1 + 0.1 * k, sy: 1 - 0.14 * k, end: false };
  }
  return { foot: to, lift: 0, tilt: 0, sx: 1, sy: 1, end: true };
}

// ───── 설 곳 찾기 ─────

// 글자·그림·입력칸 위에 얹히는 점을 내용으로 본다. 카드나 띠의 빈 바탕은 가려도 된다.
const MEDIA = "img,svg,video,canvas,iframe,input,textarea,select,[data-haechi-avoid]";
let range: Range | null = null;

function onContent(el: Element, x: number, y: number) {
  if (el.closest(MEDIA)) return true;
  range ??= document.createRange();
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType !== 3 || !n.textContent?.trim()) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 3 && y <= r.bottom + 3) return true;
    }
  }
  return false;
}

/** 해치 몸이 덮을 네모 안을 점 서른다섯 개(가로 5 × 세로 7)로 찍어 글자·그림 위에 얹히는 점 수를 센다(0이면 가리는 것 없음).
 *  짧은 딱지 글자가 점 사이에 끼지 않게 네모 끝까지 촘촘히 찍는다 */
export function coverage(left: number, top: number, w: number, h: number) {
  const z = zoomOf();
  let n = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 7; j++) {
      const x = (left + w * (0.04 + (0.92 * i) / 4)) * z;
      const y = (top + h * (0.04 + (0.92 * j) / 6)) * z;
      const el = document.elementsFromPoint(x, y).find((e) => !e.closest(".hc-layer"));
      if (el && onContent(el, x, y)) n++;
    }
  }
  return n;
}

// 올라설 수 있는 칸: 바로가기, 게시판, 상세 쪽 칸, 그리고 data-haechi-perch를 붙인 칸
const PERCH = '[data-haechi-perch], [data-haechi-target^="tile-"], [data-haechi-target="popular"], [data-haechi-target^="detail-"]';

type PickOpts = {
  cur: XY;
  w: number; // 가장 넓은 포즈의 폭
  h: number;
  mouse: XY | null;
  avoid: Box[]; // 대화창·말풍선처럼 서지 않을 곳
  far?: boolean; // 거리 제한 없이(올라선 칸을 잃었을 때)
};

/** 지금 위치에서 너무 멀지 않고, 글자·그림을 가리지 않고, 마우스 바로 아래가 아닌 곳을 하나 고른다.
 *  후보를 무게에 따라 섞은 뒤 앞에서부터 가림 검사를 해, 처음 나오는 가리지 않는 곳을 쓴다(검사 횟수를 줄인다) */
export function pickSpot({ cur, w, h, mouse, avoid, far }: PickOpts): Spot | null {
  const { vw, vh } = viewport();
  const top = topLimit();
  const left = leftLimit();
  const minX = left + w / 2 + 10;
  const maxX = vw - w / 2 - 16;
  const maxD = far ? Infinity : Math.min(320, vw * 0.32);
  type Cand = Spot & { weight: number; box: [number, number, number, number] };
  const cands: Cand[] = [];
  const bw = w * 0.8; // 가림 검사 폭: 그림 상자에서 흔드는 팔·꼬리 여백을 뺀 몸 폭


  const ok = (foot: XY, l: number, bw: number) => {
    const d = Math.hypot(foot.x - cur.x, foot.y - cur.y);
    if ((!far && d < 60) || d > maxD) return false;
    if (mouse && Math.hypot(foot.x - mouse.x, foot.y - h / 2 - mouse.y) < 130) return false;
    const t = foot.y - h;
    return !avoid.some((b) => l < b.right + 8 && l + bw > b.left - 8 && t < b.bottom + 8 && foot.y > b.top - 8);
  };

  // 바닥: 화면 아래를 고르게 나눈 곳
  if (maxX > minX) {
    for (let i = 0; i < 8; i++) {
      const x = minX + ((maxX - minX) * (i + Math.random() * 0.8)) / 8;
      const foot = { x, y: vh - FLOOR_GAP };
      if (ok(foot, x - w / 2, w)) cands.push({ foot, kind: "floor", weight: 1, box: [x - bw / 2, foot.y - h, bw, h] });
    }
  }

  // 칸 윗변: 왼쪽·가운데·오른쪽
  document.querySelectorAll<HTMLElement>(PERCH).forEach((el) => {
    if (!el.getClientRects().length) return;
    const r = rectOf(el);
    if (r.width < w * 1.2 || r.top - h < top + 6 || r.top > vh - 40) return;
    for (const f of [0.15, 0.5, 0.85]) {
      const x = Math.max(r.left + w / 2, Math.min(r.right - w / 2, r.left + r.width * f));
      if (x < minX || x > maxX) continue;
      const foot = { x, y: r.top + PERCH_SINK };
      if (!ok(foot, x - w / 2, w)) continue;
      cands.push({ foot, kind: "perch", perch: { el, dx: x - r.left }, name: el.dataset.haechiTarget, weight: 1.4, box: [x - bw / 2, foot.y - h, bw, h - 6] });
    }
  });

  // 화면 오른쪽 끝: 몸의 4할만 보이게
  const edge = edgeSpot(w, h);
  if (edge && ok(edge.foot, vw - w * 0.42, w * 0.42)) cands.push({ ...edge, weight: 0.5, box: [vw - w * 0.42, edge.foot.y - h, w * 0.42, h] });

  // 무게에 따라 섞기(무게가 클수록 앞에 오기 쉽다)
  const order = cands.map((c) => ({ c, k: Math.random() ** (1 / c.weight) })).sort((a, b) => b.k - a.k);
  for (const { c } of far ? order : order.slice(0, 14)) {
    if (coverage(...c.box) === 0) return c;
  }
  return null;
}

/** 끌어다 놓은 발밑이 칸 윗변 가까이면 그 칸에 올라선 곳을 돌려준다(스크롤하면 그 칸을 따라간다) */
export function perchNear(foot: XY, w: number): Spot | null {
  let best: Spot | null = null;
  let bestD = Infinity;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(PERCH))) {
    if (!el.getClientRects().length) continue;
    const r = rectOf(el);
    const d = Math.abs(foot.y - r.top);
    if (d > 28 || d >= bestD || r.width < w * 1.2 || foot.x < r.left + w * 0.3 || foot.x > r.right - w * 0.3) continue;
    const x = Math.max(r.left + w / 2, Math.min(r.right - w / 2, foot.x));
    best = { foot: { x, y: r.top + PERCH_SINK }, kind: "perch", perch: { el, dx: x - r.left }, name: el.dataset.haechiTarget };
    bestD = d;
  }
  return best;
}

/** 발밑 위치에 선 해치가 글자·그림을 몇 점 가리는지(화면 밖으로 나간 몸은 빼고 잰다) */
export function coverAt(foot: XY, w: number, h: number) {
  const { vw } = viewport();
  const left = foot.x - w * 0.4;
  const right = Math.min(vw, foot.x + w * 0.4);
  return right - left < 8 ? 0 : coverage(left, foot.y - h, right - left, h);
}

/** 화면 오른쪽 끝에서 몸의 4할만 내미는 곳. 갈 곳이 없을 때 마지막으로 쓴다 */
export function edgeSpot(w: number, h: number): Spot | null {
  const { vw, vh } = viewport();
  const foot = { x: vw + w / 2 - w * 0.42, y: vh * (0.45 + Math.random() * 0.4) };
  return foot.y - h > topLimit() + 10 ? { foot, kind: "edge" } : null;
}
