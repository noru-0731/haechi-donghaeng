"use client";

// 해치 층: 등장 → 인사 말풍선 → 화면을 돌아다니기 → (누르면) 해치 곁에 말풍선 대화창 → 가리키기·포즈·카드.
// 해치는 대화 중이 아니면 몇 초마다 화면 아래 바닥, 카드·바로가기 윗변, 화면 오른쪽 끝 가운데 글자를 가리지 않는 곳으로 옮겨 다닌다.
// 같은 높이는 걷고 높이가 다르면 뛰어오른다. 올라선 칸은 스크롤해도 따라가고, 칸이 화면 밖으로 나가면 바닥으로 뛰어내린다.
// 마우스나 손가락으로 해치를 좌우로 문지르면 쓰다듬기로 알아듣고 하트로 반응한다. 오래 아무도 건드리지 않으면 꾸벅 존다.
// 마우스로 누른 채 끌거나 손가락으로 길게 누른 뒤 끌면 원하는 곳으로 옮길 수 있고, 놓은 자리에 한동안 머문다.
// 대화는 이 브라우저 메모리에만 있고, 매번 지금까지의 대화를 서버(/api/haechi)에 보내 답을 받는다.
// 서버가 실패하면 대본 흐름(lib/haechi/fallback.ts)으로 이어 간다.
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { hasCrisisWords } from "@/lib/haechi/crisis";
import { fallbackReply } from "@/lib/haechi/fallback";
import { DEMOS, EXPLAIN, GREETING, OPENER, STARTERS, crisisReply, limitReply } from "@/lib/haechi/scripts";
import {
  LIMITS,
  POSES,
  POSE_SIZE,
  type ChatTurn,
  type HaechiReply,
  type HaechiResponse,
  type PageInfo,
  type Pose,
} from "@/lib/haechi/types";
import { Bubble, BubbleText, CrisisMsg, PrivacyMsg, ServiceMsg, SummaryMsg, type Who } from "./Cards";
import {
  FLOOR_GAP,
  PACE,
  PERCH_SINK,
  contentBox,
  coverAt,
  edgeSpot,
  leftLimit,
  makeTween,
  perchNear,
  pickSpot,
  rectOf,
  sampleTween,
  topLimit,
  viewport,
  zoomOf,
  type Box,
  type Spot,
  type Tween,
  type XY,
} from "./motion";
import "./haechi.css";

type Phase = "idle" | "greet" | "roam" | "chat" | "hidden";
type Entry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "haechi"; out: HaechiReply; notice?: string; local?: boolean; fresh?: boolean }
  | { id: number; kind: "crisis" }
  | { id: number; kind: "summary"; out: HaechiReply };
type PanelPos = { side: "left" | "right"; x: number; bottom: number; maxH: number };

const FALLBACK_NOTICE = "잠시 연결이 느려 기본 안내로 이어 갈게요.";
const DWELL_MS = 8000;
const NEAR_APPLY_MS = 1500;
const CHAR_H = { desk: 110, mob: 80 }; // 해치 높이(CSS px). 그림은 4배 업스케일이라 2배 화면에서도 또렷하다
const MAX_RATIO = Math.max(...POSES.map((p) => POSE_SIZE[p][0] / POSE_SIZE[p][1])); // 가장 넓은 포즈의 폭/높이
const PANEL_W = 400; // 데스크톱 대화창 폭(haechi.css .hc-panel과 같게)
const GAP = 10; // 해치와 대화창 사이
const ROAM_MIN = 12000;
const ROAM_MAX = 20000;
const PARK_MS = 30000; // 끌어다 놓으면 이만큼은 그 자리에 머문다
const DRAG_START = 6; // 마우스로 누른 채 이만큼(px) 움직이면 끌기로 본다
const HOLD_MS = 320; // 손가락은 이만큼 길게 누른 뒤에 끌 수 있다(바로 문지르면 쓰다듬기)
const TIP_MS = 3400;
const DOZE_MS = 45000; // 이만큼 아무도 건드리지 않으면 존다
const POINT_STAY_MS = 7000;
const GREET_WAIT_MS = 15000; // 인사에 답이 없으면 이만큼 뒤 돌아다니기 시작

/** 돌아다니다 그 위치에 서면 하는 한 줄 말(가리킬 이름별) */
const TIPS: Record<string, string> = {
  "tile-job": "다시 일을 시작하고 싶다면 여기부터 봐요.",
  "tile-housing": "월세나 주거비 지원은 여기 있어요.",
  "tile-mind": "마음이 힘들 때 이어 줄 곳이에요.",
  "tile-relation": "외롭거나 사람 만나기 힘들 때 여기예요.",
  "tile-guide": "누리집 쓰는 법이 궁금하면 여기요.",
  popular: "지금 이용할 수 있는 곳을 모아 뒀어요.",
  "detail-apply": "신청 순서는 여기 적혀 있어요.",
  "detail-contact": "전화번호는 여기 있어요.",
  "detail-target": "대상 조건부터 보면 좋아요.",
};
const FLOOR_TIPS = [
  "궁금한 게 있으면 저를 눌러 주세요.",
  "어디부터 볼지 모르겠으면 불러 주세요.",
  "천천히 둘러봐요. 저는 여기 있을게요.",
  "저를 살살 문질러 줘도 돼요.",
];
const EDGE_TIPS = ["여기서 보고 있었어요.", "필요하면 언제든 불러요."];
const PET_LINES = ["헤헤, 간지러워요.", "기분 좋아요.", "고마워요, 힘이 나요."];
const DROP_LINES = ["여기 있을게요.", "여기서 기다릴게요."];
const PET_HINT = "누르면 이야기해요. 살살 문지르면 좋아해요.";

// 포즈 그림이 보는 방향. 가리키기만 왼쪽을 보고, 나머지는 오른쪽을 보는 그림으로 친다
const NATIVE_FACE: Partial<Record<Pose, 1 | -1>> = { point: -1 };

// 한 번 하는 몸짓(Web Animations). 숨쉬기·생각하기·졸기 같은 반복 몸짓은 haechi.css 클래스로 한다
const ACTS = {
  enter: {
    frames: [
      { transform: "translateY(140px) scale(0.6)", opacity: 0 },
      { transform: "translateY(-12px) scale(1.06)", opacity: 1, offset: 0.6 },
      { transform: "none", opacity: 1 },
    ],
    ms: 900,
  },
  hop: {
    frames: [
      { transform: "none" },
      { transform: "translateY(-16px) scale(0.96, 1.05)", offset: 0.25 },
      { transform: "scale(1.06, 0.94)", offset: 0.5 },
      { transform: "translateY(-9px)", offset: 0.72 },
      { transform: "none" },
    ],
    ms: 700,
  },
  tilt: {
    frames: [{ transform: "none" }, { transform: "rotate(-9deg)", offset: 0.3 }, { transform: "rotate(6deg)", offset: 0.65 }, { transform: "none" }],
    ms: 1100,
  },
  wave: {
    frames: [
      { transform: "none" },
      { transform: "rotate(-6deg)" },
      { transform: "rotate(6deg)" },
      { transform: "rotate(-5deg)" },
      { transform: "rotate(4deg)" },
      { transform: "none" },
    ],
    ms: 1200,
  },
  nod: {
    frames: [
      { transform: "none" },
      { transform: "translateY(3px) rotate(3deg)", offset: 0.3 },
      { transform: "none", offset: 0.55 },
      { transform: "translateY(3px) rotate(3deg)", offset: 0.8 },
      { transform: "none" },
    ],
    ms: 900,
  },
  wiggle: {
    frames: [
      { transform: "none" },
      { transform: "scale(1.07, 0.95) rotate(-4deg)" },
      { transform: "scale(0.96, 1.05) rotate(4deg)" },
      { transform: "scale(1.05, 0.96) rotate(-3deg)" },
      { transform: "none" },
    ],
    ms: 650,
  },
  peek: {
    frames: [
      { transform: "none" },
      { transform: "translateX(-16px) rotate(-7deg)", offset: 0.35 },
      { transform: "translateX(-16px) rotate(-7deg)", offset: 0.65 },
      { transform: "none" },
    ],
    ms: 1600,
  },
} satisfies Record<string, { frames: Keyframe[]; ms: number }>;
type Act = keyof typeof ACTS;

let nextId = 1;
const newId = () => nextId++;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pickOne = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

function pageInfo(path: string): PageInfo {
  const names = new Set<string>();
  document.querySelectorAll<HTMLElement>("[data-haechi-target]").forEach((el) => {
    if (el.offsetParent !== null || el.getClientRects().length) names.add(el.dataset.haechiTarget!);
  });
  return { path, title: document.title.split("|")[0].trim(), targets: [...names] };
}

function toTurns(entries: Entry[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const e of entries) {
    if (e.kind === "user") turns.push({ role: "user", text: e.text });
    else if (e.kind === "haechi" && turns.length) turns.push({ role: "assistant", out: e.out });
  }
  return turns;
}

function PoseImg({ pose, h, className }: { pose: Pose; h: number; className?: string }) {
  const [w0, h0] = POSE_SIZE[pose];
  const w = Math.round((h * w0) / h0);
  // eslint-disable-next-line @next/next/no-img-element -- 포즈를 자주 바꾸는 작은 투명 그림이라 그대로 쓴다
  return <img src={`/haechi/${pose}.png`} width={w} height={h} alt="" className={className} draggable={false} />;
}

/** 대화창 머리와 해치 말 옆의 동그란 얼굴 */
function Face({ small }: { small?: boolean }) {
  return (
    <span className={`hc-ava${small ? " hc-ava--sm" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- 얼굴만 잘라 보이는 장식 그림 */}
      <img src="/haechi/listen.png" alt="" draggable={false} />
    </span>
  );
}

/** 해치 말을 글자 단위로 흘려 보여 준다(화면 효과. 읽기 도구에는 한 번에 읽힌다) */
function Typer({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) {
      setN(text.length);
      return;
    }
    const step = Math.max(1, Math.ceil(text.length / 70));
    const id = setInterval(() => {
      setN((v) => {
        const nv = Math.min(text.length, v + step);
        if (nv >= text.length) clearInterval(id);
        return nv;
      });
    }, 22);
    return () => clearInterval(id);
  }, [text, animate]);
  return (
    <>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export default function HaechiLayer() {
  const path = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [bubble, setBubble] = useState<"greet" | "explain">("greet");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [pose, setPoseState] = useState<Pose>("hello");
  const [ghost, setGhost] = useState<{ pose: Pose; id: number } | null>(null);
  const [face, setFace] = useState<1 | -1>(-1);
  const [placed, setPlaced] = useState(false);
  const [tip, setTip] = useState<{ text: string; shift: number } | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [dozing, setDozing] = useState(false);
  const [charH, setCharH] = useState(CHAR_H.desk);
  const [panel, setPanel] = useState<PanelPos | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>();
  const [sheetDown, setSheetDown] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [botMenu, setBotMenu] = useState(false); // 입력줄 '메뉴' 단추의 말 예시
  const [pinOpen, setPinOpen] = useState(false); // '알게 된 것' 띠를 펼쳤는지
  const [privacyOpen, setPrivacyOpen] = useState(false); // 대화창 맨 위 개인정보·AI 이용 안내를 펼쳤는지
  const [demo, setDemo] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [calm, setCalm] = useState(false); // 움직임 줄이기 설정(바뀌면 돌아다니기를 다시 정한다)
  const [away, setAway] = useState(false); // 가리키러 나가 있는 동안(머리말 메뉴 위로 올라가야 한다)
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState<React.CSSProperties | null>(null); // 해치를 누르면 뜨는 작은 메뉴(위치)
  const [pinned, setPinned] = useState(false); // '여기 머물기': 돌아다니기와 몸짓을 멈춘다(팀 피드백 1·10)
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const [callPos, setCallPos] = useState<{ side: "left" | "right"; top: number } | null>(null); // 끌어 옮긴 '해치 부르기' 단추 위치
  const callDragRef = useRef<{ id: number; sx: number; sy: number; dy: number; on: boolean; x: number; y: number } | null>(null);
  const callMovedRef = useRef(false);
  const [ringOn, setRingOn] = useState(0); // 가리키기 테두리. 켤 때마다 번호가 바뀌어 맥박 효과를 다시 튼다

  const entriesRef = useRef<Entry[]>([]);
  const pendingRef = useRef(false);
  const logRef = useRef<HTMLOListElement>(null);
  const timesRef = useRef(new Map<number, string>()); // 말마다 처음 그린 시각(말풍선의 시간)
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const charRef = useRef<HTMLButtonElement>(null);
  const rigRef = useRef<HTMLSpanElement>(null);
  const actRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<React.CSSProperties | null>(null);
  const glowRef = useRef<HTMLElement | null>(null); // 가리키는 요소
  const ringRef = useRef<HTMLDivElement>(null); // 가리키는 요소 둘레에 그리는 테두리
  const warmedRef = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const convRef = useRef(0); // 처음부터를 누를 때마다 바뀐다. 이전 대화의 늦은 답은 버린다
  const abortRef = useRef<AbortController | null>(null);
  const demoRunRef = useRef(0); // 시연 실행 번호. 바뀌면 진행 중인 시연을 멈춘다
  const callRef = useRef<HTMLButtonElement>(null);
  const focusCallRef = useRef(false);

  // 움직임 상태(화면 그리기마다 바뀌어 React 상태 대신 ref에 둔다)
  const footRef = useRef<XY | null>(null); // 발밑 가운데
  const perchRef = useRef<{ el: HTMLElement; dx: number; sticky?: boolean; left0?: number } | null>(null); // 올라선 칸(left0: 올라선 때의 왼변)
  const tweenRef = useRef<Tween | null>(null);
  const moveIdRef = useRef(0);
  const poseRef = useRef<Pose>("hello");
  const charHRef = useRef(CHAR_H.desk);
  charHRef.current = charH;
  const dockRef = useRef<XY | null>(null); // 대화 중 해치가 서는 곳(대화창 바로 옆)
  const awayRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 가리키러 나가 있는 동안의 돌아오기 시계
  const hoverRef = useRef(false);
  const mouseRef = useRef<XY | null>(null);
  const activeAtRef = useRef(0); // 마지막으로 이용자가 움직인 때
  const dozingRef = useRef(false);
  const petRef = useRef({ anchor: 0, dir: 0, flips: [] as number[], count: 0, pressed: false, petted: false, active: false });
  // 끌어 옮기기: 누른 곳에서 발밑까지의 거리(off)를 지키며 따라온다. on은 끌기가 시작됐는지
  const dragRef = useRef<{ id: number; type: string; start: XY; off: XY; on: boolean } | null>(null);
  const dragDoneRef = useRef(false); // 끌기를 마친 뒤 따라오는 누르기(click)는 대화창 열기로 치지 않는다
  const parkUntilRef = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const nodAtRef = useRef(0);
  const onPerchLostRef = useRef<() => void>(() => {});
  const paintRef = useRef<(now: number) => void>(() => {});
  const limitsRef = useRef({ top: 0, left: 0 }); // 머리말 아랫변과 왼쪽 막대 오른변(크기·배율이 바뀔 때만 다시 잰다)
  const lastTfRef = useRef(""); // 같은 위치를 다시 쓰지 않게
  const backToDockRef = useRef<() => void>(() => {});

  const commit = useCallback((next: Entry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  // ───── 포즈·몸짓·말 ─────
  const setPose = useCallback((p: Pose) => {
    if (poseRef.current === p) return;
    if (!reduced()) {
      setGhost({ pose: poseRef.current, id: newId() });
      clearTimeout(timers.current.ghost);
      timers.current.ghost = setTimeout(() => setGhost(null), 280);
    }
    poseRef.current = p;
    setPoseState(p);
  }, []);

  const playAct = useCallback((a: Act) => {
    const el = actRef.current;
    if (!el || reduced() || typeof el.animate !== "function") return;
    el.getAnimations().forEach((x) => {
      if (x instanceof CSSAnimation) return;
      x.cancel();
    });
    el.animate(ACTS[a].frames, { duration: ACTS[a].ms, easing: "ease-in-out" });
  }, []);

  const showTip = useCallback((text: string) => {
    const f = footRef.current;
    const { vw } = viewport();
    const shift = f ? Math.max(140, Math.min(f.x, vw - 140)) - f.x : 0;
    setTip({ text, shift });
    clearTimeout(timers.current.tip);
    timers.current.tip = setTimeout(() => setTip(null), TIP_MS);
  }, []);

  // ───── 위치와 이동 ─────
  const sizeOf = useCallback((p: Pose) => {
    const h = charHRef.current;
    const [w0, h0] = POSE_SIZE[p];
    return { w: (h * w0) / h0, h };
  }, []);
  const halfMax = () => (charHRef.current * MAX_RATIO) / 2;

  /** 발밑 위치를 화면 안(머리말 아래, 왼쪽 막대 오른쪽)으로 가둔다 */
  const clampFoot = useCallback((f: XY, allowHeader = false): XY => {
    const { vw, vh } = viewport();
    const half = halfMax();
    const h = charHRef.current;
    const top = allowHeader ? 0 : topLimit();
    return {
      x: Math.max(leftLimit() + half + 4, Math.min(f.x, vw - half - 4)),
      y: Math.max(top + h + 4, Math.min(f.y, vh - 4)),
    };
  }, []);
  const floorAt = useCallback((x: number): XY => clampFoot({ x, y: viewport().vh - FLOOR_GAP }), [clampFoot]);

  /** 움직이지 않고 그 위치에 바로 둔다 */
  const place = useCallback(
    (f: XY) => {
      moveIdRef.current++;
      const old = tweenRef.current;
      tweenRef.current = null;
      old?.done(false);
      perchRef.current = null;
      footRef.current = clampFoot(f);
      setPlaced(true);
      paintRef.current(performance.now());
    },
    [clampFoot],
  );

  /** 걷거나 뛰어서 옮겨 간다. 끝까지 가면 true, 다른 이동이 끼어들면 false */
  const moveTo = useCallback(
    (spot: Spot | XY, opts: { pose?: Pose; kind?: Tween["kind"]; overHeader?: boolean; pace?: number } = {}) =>
      new Promise<boolean>((resolve) => {
        const s: Spot = "foot" in spot ? spot : { foot: spot, kind: "floor" };
        const perch = s.perch ?? null;
        const target = (): XY => {
          if (perch) {
            const r = rectOf(perch.el);
            return { x: r.left + perch.dx, y: r.top + PERCH_SINK };
          }
          return s.foot;
        };
        const my = ++moveIdRef.current;
        const old = tweenRef.current;
        tweenRef.current = null;
        old?.done(false);
        perchRef.current = null;
        const from = footRef.current ?? target();
        const to0 = target();
        const dx = to0.x - from.x;
        const dy = to0.y - from.y;
        if (Math.abs(dx) > 4) setFace(dx > 0 ? 1 : -1);
        if (reduced() || Math.hypot(dx, dy) < 3) {
          footRef.current = to0;
          perchRef.current = perch && { ...perch, left0: rectOf(perch.el).left };
          resolve(true);
          return;
        }
        const kind = opts.kind ?? (Math.abs(dy) < 24 ? "walk" : "jump");
        setPose(opts.pose ?? (kind === "jump" ? "cheer" : pickOne<Pose>(["hello", "search"])));
        const bound = { h: charHRef.current, ceil: opts.overHeader ? 0 : topLimit() };
        tweenRef.current = makeTween(
          kind,
          from,
          target,
          performance.now(),
          (ok) => {
            if (ok && moveIdRef.current === my) perchRef.current = perch && { ...perch, left0: rectOf(perch.el).left };
            resolve(ok);
          },
          bound,
          opts.pace,
        );
      }),
    [setPose],
  );

  // 화면 그리기: 이동 중이면 궤적을, 칸 위에 서 있으면 그 칸을 따라간다
  useEffect(() => {
    paintRef.current = (now: number) => {
      const el = charRef.current;
      if (!el || !footRef.current) return;
      const { w, h } = sizeOf(poseRef.current);
      let f = footRef.current;
      let lift = 0;
      let tilt = 0;
      let sx = 1;
      let sy = 1;
      const tw = tweenRef.current;
      if (tw) {
        const fr = sampleTween(tw, now);
        ({ lift, tilt, sx, sy } = fr);
        f = fr.foot;
        if (fr.end) {
          tweenRef.current = null;
          tw.done(true);
        }
      } else if (perchRef.current) {
        const { el: pel, dx, sticky, left0 } = perchRef.current;
        const r = rectOf(pel);
        f = { x: r.left + dx, y: r.top + PERCH_SINK };
        // 올라선 칸이 머리말 뒤나 화면 밖으로 사라지면(넘기기 카드가 옆으로 빠질 때도) 내려온다. 대화창 판은 끝까지 따라간다
        const { vw, vh } = viewport();
        const { top, left } = limitsRef.current;
        // 넘기기 카드처럼 칸이 옆으로 밀리기 시작해도 뛰어내린다(타고 가면 다른 카드 글자를 가린다)
        const slid = left0 !== undefined && Math.abs(r.left - left0) > 6;
        const gone = !sticky && (slid || f.y - h < top - 4 || f.y > vh - 4 || f.x < left + w * 0.3 || f.x > vw - w * 0.3);
        if (!pel.isConnected || gone) {
          perchRef.current = null;
          f = clampFoot(f);
          footRef.current = f;
          onPerchLostRef.current();
        }
      }
      footRef.current = f;
      const rig = rigRef.current;
      const tf = `translate3d(${(f.x - w / 2).toFixed(1)}px, ${(f.y - h).toFixed(1)}px, 0)`;
      const rt = lift || tilt || sx !== 1 || sy !== 1 ? `translateY(${(-lift).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})` : "";
      // 서 있는 동안은 같은 값을 다시 쓰지 않는다
      const key = `${tf}|${rt}`;
      if (key === lastTfRef.current && el.style.transform) return;
      lastTfRef.current = key;
      el.style.transform = tf;
      if (rig) rig.style.transform = rt;
    };
    let raf = 0;
    const loop = (now: number) => {
      paintRef.current(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sizeOf, clampFoot]);

  const showChar = placed && (phase === "greet" || phase === "roam" || phase === "chat");
  // 해치가 나타나는 순간 바로 제 위치에 그린다(한 장면 동안 왼쪽 위에 보이지 않게)
  useLayoutEffect(() => {
    if (showChar) paintRef.current(performance.now());
  }, [showChar, pose, charH]);

  // ───── 졸기 ─────
  const wake = useCallback(() => {
    if (!dozingRef.current) return;
    dozingRef.current = false;
    setDozing(false);
    setPose("worry");
    clearTimeout(timers.current.wake);
    timers.current.wake = setTimeout(() => {
      if (dozingRef.current || phaseRef.current !== "roam") return;
      setPose("hello");
      playAct("hop");
      if (Math.random() < 0.6) showTip("앗, 깜빡 졸았어요.");
    }, 650);
  }, [setPose, playAct, showTip]);

  useEffect(() => {
    activeAtRef.current = Date.now();
    const onActive = (e: Event) => {
      activeAtRef.current = Date.now();
      if (e instanceof PointerEvent) {
        const z = parseFloat(document.body.style.zoom) || 1;
        mouseRef.current = { x: e.clientX / z, y: e.clientY / z };
      }
      wake();
    };
    const evs = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((n) => window.addEventListener(n, onActive, { passive: true }));
    return () => evs.forEach((n) => window.removeEventListener(n, onActive));
  }, [wake]);

  // ───── 쓰다듬기 ─────
  const pet = useCallback(() => {
    const st = petRef.current;
    activeAtRef.current = Date.now();
    wake();
    st.count++;
    st.active = true;
    clearTimeout(timers.current.petEnd);
    timers.current.petEnd = setTimeout(() => {
      st.count = 0;
      st.active = false;
      setPose(phaseRef.current === "chat" ? "listen" : "hello");
    }, 2200);
    setPose(st.count >= 3 ? "cheer" : "wink");
    playAct(st.count === 4 ? "hop" : "wiggle");
    const n = st.count >= 3 ? 3 : 1 + Math.round(Math.random());
    const add = Array.from({ length: n }, () => ({ id: newId(), x: Math.round((Math.random() - 0.5) * 44) }));
    setHearts((hs) => [...hs, ...add].slice(-9));
    setTimeout(() => setHearts((hs) => hs.filter((h) => !add.includes(h))), 1100);
    if (st.count === 1) showTip(pickOne(PET_LINES));
    else if (st.count === 4) showTip("힘이 나요. 더 열심히 찾아볼게요!");
    try {
      sessionStorage.setItem("hc-pet-hint", "1");
    } catch {}
  }, [wake, setPose, playAct, showTip]);

  // 좌우로 문지르는 움직임(1.3초 안에 방향이 세 번 바뀜)을 쓰다듬기로 본다. 마우스는 올려 두고 문지르기, 손가락은 누른 채 문지르기
  const onPetMove = (e: React.PointerEvent) => {
    const st = petRef.current;
    if (e.pointerType !== "mouse" && !st.pressed) return;
    const d = e.clientX - st.anchor;
    if (Math.abs(d) < 9) return;
    const dir = d > 0 ? 1 : -1;
    if (st.dir && dir !== st.dir) {
      const now = performance.now();
      st.flips = st.flips.filter((t) => now - t < 1300);
      st.flips.push(now);
      if (st.flips.length >= 3) {
        st.flips = [];
        if (st.pressed) st.petted = true;
        pet();
      }
    }
    st.dir = dir;
    st.anchor = e.clientX;
  };

  // ───── 캐시 미리 데우기(대화 전에 한 번) ─────
  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    fetch("/api/haechi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warm: true, page: { path: pathRef.current, title: "", targets: [] } }),
    }).catch(() => {});
  }, []);

  // ───── 등장 ─────
  const floorRight = useCallback(() => floorAt(viewport().vw - halfMax() - 36), [floorAt]);

  /** 인사 말풍선 위치: 데스크톱은 해치 왼쪽, 휴대폰은 해치 위 */
  const layoutBubble = useCallback(() => {
    const f = footRef.current;
    if (!f) return;
    const { vw, vh } = viewport();
    const h = charHRef.current;
    setBubbleStyle(
      vw >= 700
        ? { left: Math.max(16, f.x - halfMax() - 12 - 380), top: Math.max(topLimit() + 12, Math.min(f.y - h - 30, vh - 300)) }
        : { left: 12, right: 12, bottom: vh - (f.y - h) + 10 },
    );
  }, []);

  const greet = useCallback(() => {
    setPhase((p) => (p === "idle" ? "greet" : p));
    setBubble("greet");
    place(floorRight());
    setFace(-1);
    setPose("hello");
    layoutBubble();
    requestAnimationFrame(() => playAct("enter"));
    setLive(GREETING);
    try {
      sessionStorage.setItem("hc-greeted", "1");
    } catch {}
    warm();
  }, [warm, place, floorRight, setPose, layoutBubble, playAct]);

  useEffect(() => {
    if (phase !== "idle") return;
    if (DEMOS[window.location.hash]) return; // 시연은 아래에서 따로 시작
    let greeted = false;
    try {
      greeted = sessionStorage.getItem("hc-greeted") === "1";
    } catch {}
    if (greeted) {
      // 이미 인사했으면 바로 돌아다닌다
      place(floorRight());
      setPhase("roam");
      return;
    }
    const t = setTimeout(greet, DWELL_MS);
    // 신청 안내 근처에서 멈추면 조금 일찍 나온다
    let dwell: ReturnType<typeof setTimeout> | undefined;
    const apply = document.querySelector('[data-haechi-target="detail-apply"]');
    const io = apply
      ? new IntersectionObserver(
          ([e]) => {
            clearTimeout(dwell);
            if (e.isIntersecting) dwell = setTimeout(greet, NEAR_APPLY_MS);
          },
          { threshold: 0.6 },
        )
      : null;
    if (apply && io) io.observe(apply);
    return () => {
      clearTimeout(t);
      clearTimeout(dwell);
      io?.disconnect();
    };
  }, [phase, path, greet, place, floorRight]);

  // 인사에 답이 없으면 말풍선을 닫고 돌아다닌다
  useEffect(() => {
    if (phase !== "greet") return;
    const t = setTimeout(() => setPhase((p) => (p === "greet" ? "roam" : p)), GREET_WAIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // ───── 돌아다니기 ─────
  /** 도착하거나 그 위치에 머물 때 하는 몸짓 하나 */
  const doIdle = useCallback(
    (spot?: Spot) => {
      if (spot?.kind === "edge") {
        setFace(-1);
        setPose("search");
        playAct("peek");
        if (Math.random() < 0.4) showTip(pickOne(EDGE_TIPS));
        return;
      }
      const kind = pickOne(["look", "hop", "tilt", "wave", "rest"] as const);
      if (kind === "look") {
        // 두리번거리기
        setPose("search");
        [500, 1050, 1600].forEach((ms, i) =>
          setTimeout(() => {
            if (phaseRef.current === "roam" && !tweenRef.current) setFace(i % 2 ? 1 : -1);
          }, ms),
        );
      } else if (kind === "hop") {
        setPose(pickOne<Pose>(["cheer", "idea"]));
        playAct("hop");
      } else if (kind === "tilt") {
        setPose("wink");
        playAct("tilt");
      } else if (kind === "wave") {
        setPose("hello");
        playAct("wave");
      } else setPose(pickOne<Pose>(["listen", "idea"]));
      if (spot && Math.random() < 0.45) showTip((spot.name && TIPS[spot.name]) || pickOne(FLOOR_TIPS));
    },
    [setPose, playAct, showTip],
  );

  const startDoze = useCallback(() => {
    if (dozingRef.current || reduced()) return;
    dozingRef.current = true;
    setDozing(true);
    setTip(null);
    setPose("listen");
  }, [setPose]);

  /** 서지 않을 곳: 대화창, 인사 말풍선 */
  const avoidBoxes = (): Box[] =>
    Array.from(document.querySelectorAll(".hc-panel, .hc-bubble")).map((el) => rectOf(el));

  useEffect(() => {
    if (phase !== "roam") return;
    if (!footRef.current) place(floorRight());
    if (reduced() || pinned) return; // 움직임 줄이기나 '여기 머물기': 그 위치에 둔다
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const next = (ms: number) => {
      t = setTimeout(step, ms);
    };
    const step = async () => {
      if (!alive || reduced()) return;
      const busy = !!menuRef.current || hoverRef.current || petRef.current.active || dozingRef.current || tweenRef.current || dragRef.current?.on || Date.now() < parkUntilRef.current;
      if (busy || document.visibilityState !== "visible") return next(1500);
      if (Date.now() - activeAtRef.current > DOZE_MS) {
        startDoze();
        return next(2000);
      }
      const cur = footRef.current!;
      const w = halfMax() * 2;
      const h = charHRef.current;
      // 지금 선 곳이 글자를 가리면(처음 나타난 곳이나 스크롤로 글이 밀려 들어온 곳) 몸짓 없이 바로 비켜난다
      const covering = !perchRef.current && coverAt(cur, w, h) > 0;
      if (!covering && Math.random() < 0.25) {
        doIdle();
        return next(3500 + Math.random() * 3000);
      }
      let spot = pickSpot({ cur, w, h, mouse: mouseRef.current, avoid: avoidBoxes() });
      if (!spot && covering) spot = pickSpot({ cur, w, h, mouse: null, avoid: avoidBoxes(), far: true }) ?? edgeSpot(w, h);
      if (!spot) {
        doIdle();
        return next(4000);
      }
      const ok = await moveTo(spot, { pace: PACE.roam });
      if (!alive) return;
      if (ok) doIdle(spot);
      next(ROAM_MIN + Math.random() * (ROAM_MAX - ROAM_MIN));
    };
    next(1600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [phase, calm, pinned, place, floorRight, moveTo, doIdle, startDoze]);

  // 올라선 칸이 사라지면 가까운 빈 곳으로, 없으면 바로 아래 바닥으로 뛰어내린다
  useEffect(() => {
    onPerchLostRef.current = () => {
      const f = footRef.current;
      if (!f || phaseRef.current === "hidden") return;
      const roam = phaseRef.current === "roam" && !reduced();
      const w = halfMax() * 2;
      const h = charHRef.current;
      // 가까운 빈 곳부터 찾고, 없을 때만 멀리 본다
      const spot = roam
        ? (pickSpot({ cur: f, w, h, mouse: null, avoid: avoidBoxes() }) ?? pickSpot({ cur: f, w, h, mouse: null, avoid: avoidBoxes(), far: true }))
        : null;
      void moveTo(spot ?? edgeSpot(w, h) ?? floorAt(f.x), { kind: "jump", pace: roam ? PACE.roam : PACE.task }).then((ok) => {
        if (ok) setPose(phaseRef.current === "chat" ? "listen" : "hello");
      });
    };
  }, [moveTo, floorAt, setPose]);

  // ───── 해치 메뉴(누르면 뜸): 이야기하기, 여기 머물기, 숨기기 ─────
  const closeMenu = useCallback(() => {
    menuRef.current = null;
    setMenu(null);
  }, []);
  const toggleMenu = useCallback(() => {
    if (menuRef.current) return closeMenu();
    const f = footRef.current;
    if (!f) return;
    const { vw } = viewport();
    const h = charHRef.current;
    const w = 168;
    const left = Math.max(8, Math.min(vw - w - 8, f.x - w / 2));
    const top = Math.max(topLimit() + 8, f.y - h - 132);
    const style: React.CSSProperties = { left, top, width: w };
    menuRef.current = style;
    setMenu(style);
    setTip(null);
  }, [closeMenu]);

  // 대화창을 열거나 숨기면 메뉴를 닫는다(열린 채 두면 돌아다니기가 계속 멈춰 있다)
  useEffect(() => {
    if (phase !== "roam") closeMenu();
  }, [phase, closeMenu]);

  // 메뉴 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest(".hc-menu") && !t.closest(".hc-char")) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, closeMenu]);

  // 이 브라우저에서 고른 '여기 머물기'와 부르기 단추 위치를 다시 쓴다
  useEffect(() => {
    try {
      if (localStorage.getItem("hc-pinned") === "1") setPinned(true);
      const raw = localStorage.getItem("hc-call-pos");
      if (raw) {
        const v = JSON.parse(raw) as { side?: string; top?: number };
        if ((v.side === "left" || v.side === "right") && typeof v.top === "number") setCallPos({ side: v.side, top: v.top });
      }
    } catch {}
  }, []);

  // ───── 대화창 열기·닫기 ─────
  /** 데스크톱: 해치가 선 곳 옆(빈 쪽)에 대화창을 붙인다. 창이 들어갈 높이·폭이 모자라면 해치가 먼저 옮겨 간다 */
  const layoutChat = useCallback(
    (move: boolean) => {
      if (!isDesktop()) {
        setPanel(null);
        return;
      }
      const { vw, vh } = viewport();
      const top = topLimit();
      const left = leftLimit();
      const half = halfMax();
      let f = clampFoot(footRef.current ?? floorRight());
      if (f.y - top < 420) f = { x: f.x, y: vh - FLOOR_GAP };
      // 지금 선 곳이 글자를 가리면 바닥에서 글자를 가리지 않는 곳을 오른쪽부터 찾는다(대화창이 들어갈 폭이 있는 곳만).
      // 끝내 없으면 가장 덜 가리는 곳에 선다(팀 피드백 10: 해치가 정보를 가림)
      const hw = half * 2;
      const hh = charHRef.current;
      if (coverAt(f, hw, hh) > 0) {
        let best = f;
        let bestCover = coverAt(f, hw, hh);
        for (let x = vw - half - 8; x >= left + half + PANEL_W + GAP + 8; x -= 32) {
          const c = { x, y: vh - FLOOR_GAP };
          const cv = coverAt(c, hw, hh);
          if (cv < bestCover) {
            best = c;
            bestCover = cv;
            if (cv === 0) break;
          }
        }
        f = best;
      }
      let side: PanelPos["side"];
      if (f.x - half - GAP - PANEL_W >= left + 8) side = "left";
      else if (f.x + half + GAP + PANEL_W <= vw - 8) side = "right";
      else {
        f = floorRight();
        side = "left";
      }
      dockRef.current = f;
      setPanel({
        side,
        x: side === "left" ? f.x - half - GAP - PANEL_W : f.x + half + GAP,
        bottom: vh - f.y,
        maxH: Math.max(Math.min(160, f.y - top - 12), Math.min(vh * 0.74, 680, f.y - top - 12)),
      });
      const faceTo = side === "left" ? -1 : 1;
      if (move) {
        void moveTo(f).then((ok) => {
          if (!ok) return;
          setFace(faceTo);
          setPose("listen");
        });
      } else {
        place(f);
        setFace(faceTo);
      }
    },
    [clampFoot, floorRight, moveTo, place, setPose],
  );

  const openChat = useCallback(() => {
    clearTimeout(timers.current.wake);
    clearTimeout(timers.current.hint);
    dozingRef.current = false;
    setDozing(false);
    setPhase("chat");
    setSheetDown(false);
    setMoreOpen(false);
    setBotMenu(false);
    setTip(null);
    if (!footRef.current) place(floorRight());
    setPose("listen");
    layoutChat(true);
    warm();
    if (!entriesRef.current.length) {
      commit([{ id: newId(), kind: "haechi", out: OPENER, local: true, fresh: true }]);
      setLive(OPENER.reply);
    }
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  }, [commit, warm, place, floorRight, layoutChat, setPose]);

  // 휴대폰·태블릿: 해치가 아래 판 윗변 오른쪽에 올라앉는다(판을 내리고 올리면 따라간다)
  useEffect(() => {
    if (phase !== "chat" || isDesktop()) return;
    const id = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const r = rectOf(el);
      const dx = r.width - halfMax() - 14;
      void moveTo({ foot: { x: r.left + dx, y: r.top + PERCH_SINK }, kind: "perch", perch: { el, dx, sticky: true } }, { kind: "jump", overHeader: true }).then((ok) => {
        if (ok) {
          setFace(-1);
          setPose("listen");
        }
      });
    });
    return () => cancelAnimationFrame(id);
  }, [phase, charH, moveTo, setPose]);

  // 창 크기나 글자·화면 설정(body zoom)이 바뀌면 해치 크기와 위치, 대화창 위치를 다시 잡는다.
  // zoom 변경은 resize 사건이 없어 body의 style 바뀜을 지켜본다
  useEffect(() => {
    let lastZoom = zoomOf();
    const onChange = () => {
      const h = isDesktop() ? CHAR_H.desk : CHAR_H.mob;
      charHRef.current = h;
      setCharH(h);
      limitsRef.current = { top: topLimit(), left: leftLimit() };
      lastTfRef.current = "";
      const ph = phaseRef.current;
      if (ph === "chat") layoutChat(false);
      else if (footRef.current && !perchRef.current) {
        const tw = tweenRef.current;
        place(clampFoot(tw ? tw.to() : footRef.current));
        if (ph === "greet") layoutBubble();
      }
    };
    limitsRef.current = { top: topLimit(), left: leftLimit() };
    setCharH(isDesktop() ? CHAR_H.desk : CHAR_H.mob);
    const mo = new MutationObserver(() => {
      const z = zoomOf();
      if (z === lastZoom) return;
      lastZoom = z;
      onChange();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", onChange);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", onChange);
    };
  }, [layoutChat, place, clampFoot, layoutBubble]);

  // 움직임 줄이기 설정이 바뀌면 지금 이동을 끝내고(켤 때) 돌아다니기를 다시 시작한다(끌 때)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (mq.matches && footRef.current) {
        const tw = tweenRef.current;
        place(tw ? tw.to() : footRef.current);
      }
      setCalm(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [place]);

  const clearGlow = () => {
    glowRef.current = null;
    setRingOn(0);
  };

  // 가리키는 동안 테두리가 요소의 글자·그림 둘레를 따라간다(스크롤해도)
  useEffect(() => {
    if (!ringOn) return;
    let id = 0;
    const tick = () => {
      const el = glowRef.current;
      const box = ringRef.current;
      if (el && box) {
        const b = contentBox(el);
        box.style.transform = `translate(${b.left}px, ${b.top}px)`;
        box.style.width = `${b.width}px`;
        box.style.height = `${b.height}px`;
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [ringOn]);

  const hide = useCallback(() => {
    demoRunRef.current++;
    setDemo(null);
    focusCallRef.current = true;
    setAway(false);
    setPhase("hidden");
    setPanel(null);
    setTip(null);
    clearGlow();
  }, []);

  /** 대화창을 접는다. 대화는 두고 해치는 다시 돌아다닌다 */
  const collapse = useCallback(() => {
    demoRunRef.current++;
    setDemo(null);
    // 키보드로 닫았으면 초점을 해치에게 돌려준다
    const hadFocus = !!panelRef.current?.contains(document.activeElement);
    setPhase("roam");
    setPanel(null);
    setMoreOpen(false);
    setBotMenu(false);
    clearGlow();
    if (awayRef.current) clearTimeout(awayRef.current);
    awayRef.current = null;
    setAway(false);
    if (hadFocus) requestAnimationFrame(() => charRef.current?.focus({ preventScroll: true }));
  }, []);

  // 닫은 뒤 키보드 초점을 해치 부르기 단추로 옮긴다
  useEffect(() => {
    if (phase === "hidden" && focusCallRef.current) {
      focusCallRef.current = false;
      callRef.current?.focus();
    }
  }, [phase]);

  const stopRequest = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRef.current = false;
    setPending(false);
  };

  const reset = useCallback(
    (fromDemo = false) => {
      convRef.current++;
      if (!fromDemo) demoRunRef.current++;
      stopRequest();
      clearGlow();
      backToDockRef.current();
      commit([{ id: newId(), kind: "haechi", out: OPENER, local: true, fresh: true }]);
      setPose(OPENER.pose);
      setLive(OPENER.reply);
      setInput("");
    },
    [commit, setPose],
  );

  // 누리집의 '해치에게 물어보기' 판(HomeBoard)이 보내는 사건으로 대화창을 연다
  useEffect(() => {
    const onOpen = () => {
      demoRunRef.current++;
      setDemo(null);
      openChat();
    };
    window.addEventListener("haechi:open", onOpen);
    return () => window.removeEventListener("haechi:open", onOpen);
  }, [openChat]);

  useEffect(() => {
    document.body.classList.toggle("hc-chat-open", phase === "chat");
    document.body.classList.toggle("hc-sheet-down", phase === "chat" && sheetDown);
  }, [phase, sheetDown]);

  useEffect(() => {
    if (phase !== "chat") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(".krds-modal.in")) return;
      if (moreOpen) setMoreOpen(false);
      else if (botMenu) setBotMenu(false);
      else collapse();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, collapse, moreOpen, botMenu]);

  // 더 보기 차림표와 입력줄 메뉴: 바깥을 누르면 닫는다
  useEffect(() => {
    if (!moreOpen && !botMenu) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest(".hc-more")) setMoreOpen(false);
      if (!t.closest(".hc-botmenu")) setBotMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moreOpen, botMenu]);

  // 새 말이 오면 대화 기록 맨 아래로
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: reduced() ? "auto" : "smooth" });
  }, [entries, pending]);

  // 해치 말이 글자 단위로 늘어나는 동안에도 맨 아래를 따라간다(이용자가 위로 올려 읽는 중이면 두고)
  useEffect(() => {
    const log = logRef.current;
    if (phase !== "chat" || !log) return;
    let atBottom = true;
    const onScroll = () => {
      atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    };
    const mo = new MutationObserver(() => {
      if (atBottom) log.scrollTop = log.scrollHeight;
    });
    log.addEventListener("scroll", onScroll, { passive: true });
    mo.observe(log, { childList: true, subtree: true, characterData: true });
    return () => {
      log.removeEventListener("scroll", onScroll);
      mo.disconnect();
    };
  }, [phase]);

  // 입력칸은 글 줄 수만큼 늘어난다(네 줄까지)
  useLayoutEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    // 비어 있으면 CSS 높이(한 줄)로 둔다. 창이 펼쳐지는 중에 재면 폭이 덜 잡혀 두 줄로 커진다
    if (!input) {
      ta.style.height = "";
      ta.style.overflowY = "hidden";
      return;
    }
    ta.style.height = "auto";
    const full = ta.scrollHeight;
    ta.style.height = `${Math.min(full, 120)}px`;
    ta.style.overflowY = full > 120 ? "auto" : "hidden";
  }, [input, phase]);

  // 이용자가 글을 치면 해치가 듣는 포즈로 끄덕인다
  useEffect(() => {
    if (phaseRef.current !== "chat" || pendingRef.current || !input) return;
    const now = Date.now();
    if (now - nodAtRef.current < 1600 || awayRef.current) return; // 가리키러 나가 있는 동안은 그대로
    nodAtRef.current = now;
    setPose("listen");
    playAct("nod");
  }, [input, setPose, playAct]);

  // ───── 가리키기 ─────
  /** 가리키러 나간 해치를 대화창 옆으로 돌려보낸다 */
  const backToDock = useCallback(() => {
    if (!awayRef.current) return;
    clearTimeout(awayRef.current);
    awayRef.current = null;
    const dock = dockRef.current;
    if (!isDesktop() || !dock || phaseRef.current !== "chat") {
      setAway(false);
      return;
    }
    void moveTo(dock, { kind: "jump" }).then((ok) => {
      setAway(false);
      if (!ok) return;
      setPose("listen");
      setFace(panel?.side === "right" ? 1 : -1);
    });
  }, [moveTo, setPose, panel]);
  backToDockRef.current = backToDock;

  const pointAt = useCallback(
    async (target: string) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-haechi-target="${target}"]`));
      const el = els.find((x) => x.getClientRects().length) ?? null;
      if (!el) return;
      clearGlow();
      glowRef.current = el;
      setRingOn(newId());
      const mine = el;
      setTimeout(() => {
        if (glowRef.current === mine) clearGlow();
      }, 9000);
      const desk = isDesktop();
      el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: desk ? "center" : "start" });
      if (!desk) {
        setPose("point"); // 휴대폰에서는 해치가 대화창 위에 머물고 요소만 강조한다
        return;
      }
      // 기다리는 사이 처음부터를 누르거나 대화창을 접으면 가리키러 가지 않는다
      const conv = convRef.current;
      const still = () => conv === convRef.current && phaseRef.current === "chat";
      await wait(reduced() ? 30 : 520);
      if (!still()) return;
      const r = rectOf(el);
      const { w, h } = sizeOf("point");
      const { vw } = viewport();
      const pr = panelRef.current ? rectOf(panelRef.current) : null;
      const hitsPanel = (f: XY) => !!pr && f.x + w / 2 > pr.left - 8 && f.x - w / 2 < pr.right + 8 && f.y > pr.top && f.y - h < pr.bottom;
      // 대상 오른쪽(왼쪽을 가리킴), 왼쪽(오른쪽을 가리킴), 아래 가운데 가운데 화면 안에 들고 대화창과 겹치지 않는 곳을 고르고,
      // 그중 다른 글자를 가장 덜 가리는 곳에 선다(머리말 메뉴를 가리킬 때 옆 메뉴 글자를 덮던 문제). 같으면 오른쪽이 먼저다
      const midY = r.top + r.height / 2 + h / 2;
      const all: { f: XY; face: 1 | -1 }[] = [
        { f: { x: r.right + w / 2 + 8, y: midY }, face: -1 },
        { f: { x: r.left - w / 2 - 8, y: midY }, face: 1 },
        { f: { x: Math.max(r.left + w / 2, Math.min(r.right - w / 2, (pr?.left ?? vw) - w / 2 - 12)), y: r.bottom + h + 6 }, face: -1 },
      ];
      const cands = all.filter((c) => c.f.x + w / 2 <= vw - 4 && c.f.x - w / 2 >= leftLimit() && !hitsPanel(c.f));
      let f: XY = cands[0]?.f ?? { x: r.left + r.width / 2, y: r.bottom + h + 6 };
      let faceTo: 1 | -1 = cands[0]?.face ?? -1;
      let least = Infinity;
      for (const c of cands) {
        const cv = coverAt(c.f, w, h);
        if (cv < least) {
          least = cv;
          f = c.f;
          faceTo = c.face;
        }
      }
      if (awayRef.current) clearTimeout(awayRef.current);
      awayRef.current = setTimeout(backToDock, POINT_STAY_MS);
      setAway(true);
      const ok = await moveTo(clampFoot(f, true), { kind: "jump", overHeader: true });
      if (!ok || !still()) return;
      setPose("point");
      setFace(faceTo);
    },
    [moveTo, sizeOf, clampFoot, setPose, backToDock],
  );

  // ───── 보내기 ─────
  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, LIMITS.inputChars);
      if (!text) return;
      // 브라우저 쪽 위기 안전망: 답을 기다리는 중이어도 연락처 카드는 바로 띄운다
      const crisisNow = hasCrisisWords(text);
      if (pendingRef.current) {
        if (crisisNow && entriesRef.current[entriesRef.current.length - 1]?.kind !== "crisis") {
          commit([...entriesRef.current, { id: newId(), kind: "crisis" }]);
          setLive("지금 바로 연락할 곳: 자살예방상담전화 109, 정신건강위기상담전화 1577-0199, 응급 119·112");
        }
        return; // 보낸 말은 입력창에 그대로 두고, 답이 오면 다시 보낼 수 있다
      }
      backToDock();
      const conv = convRef.current;
      let next: Entry[] = [...entriesRef.current, { id: newId(), kind: "user", text }];
      if (crisisNow) next = [...next, { id: newId(), kind: "crisis" }];
      commit(next);
      setInput("");
      const userTurns = next.filter((e) => e.kind === "user").length;
      let out: HaechiReply;
      let notice: string | undefined;
      if (userTurns > LIMITS.turns) {
        // 상한을 넘어도 위기가 먼저다
        out = crisisNow ? crisisReply() : limitReply();
      } else {
        pendingRef.current = true;
        setPending(true);
        setPose("search");
        const turns = toTurns(next);
        const page = pageInfo(pathRef.current);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const timer = setTimeout(() => ctrl.abort(), 25_000);
        try {
          const res = await fetch("/api/haechi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ turns, page }),
            signal: ctrl.signal,
          });
          const data = (await res.json()) as HaechiResponse;
          if (!data.ok) throw new Error(data.error);
          out = data.out;
        } catch {
          notice = FALLBACK_NOTICE;
          out = fallbackReply(turns, page.targets);
        } finally {
          clearTimeout(timer);
        }
        if (conv !== convRef.current) return; // 그사이 처음부터를 눌렀다
        abortRef.current = null;
        pendingRef.current = false;
        setPending(false);
      }
      if (crisisNow && !out.crisis) out = crisisReply(out.memo, out.profile);
      let after: Entry[] = [
        ...entriesRef.current.map((e) => (e.kind === "haechi" && e.fresh ? { ...e, fresh: false } : e)),
        { id: newId(), kind: "haechi", out, notice, fresh: true },
      ];
      if (out.crisis && !crisisNow) after = [...after, { id: newId(), kind: "crisis" }];
      if (out.summary && !out.crisis) after = [...after, { id: newId(), kind: "summary", out }];
      commit(after);
      // 데스크톱에서 가리킬 곳이 있으면 포즈는 가리키기(pointAt)가 정한다
      if (out.point_to === "none" || !isDesktop()) setPose(out.pose);
      // 추천이 나오면 기뻐서 뛰고, 위기 안내 때는 조용히 곁에 있는다
      if (out.recommend.length && !out.crisis) playAct("hop");
      setLive(out.reply);
      if (out.point_to !== "none" && phaseRef.current === "chat") void pointAt(out.point_to);
    },
    [commit, pointAt, backToDock, setPose, playAct],
  );

  const showSummary = useCallback(() => {
    const list = entriesRef.current;
    const lastSummary = [...list].reverse().find((e) => e.kind === "summary");
    // 요약 뒤에 이용자가 더 말했으면 새 요약을 만든다
    const newer = lastSummary ? list.slice(list.indexOf(lastSummary) + 1).some((e) => e.kind === "user") : true;
    if (lastSummary && !newer) {
      document.getElementById(`hc-e${lastSummary.id}`)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    const lastOut = [...list].reverse().find((e): e is Extract<Entry, { kind: "haechi" }> => e.kind === "haechi");
    if (!lastOut) return;
    const recs = [...list]
      .reverse()
      .find((e): e is Extract<Entry, { kind: "haechi" }> => e.kind === "haechi" && e.out.recommend.length > 0);
    commit([
      ...list,
      { id: newId(), kind: "summary", out: { ...lastOut.out, summary: "", recommend: recs?.out.recommend ?? [] } },
    ]);
  }, [commit]);

  // ───── 시연(#demo1, #demo2) ─────
  useEffect(() => {
    const run = async (hash: string) => {
      const d = DEMOS[hash];
      if (!d) return;
      const my = ++demoRunRef.current;
      const alive = () => demoRunRef.current === my;
      setDemo(d.title);
      if (pathRef.current !== d.start) router.push(d.start);
      await wait(400);
      if (!alive()) return;
      entriesRef.current = [];
      setPhase("greet");
      setBubble("greet");
      place(floorRight());
      setFace(-1);
      setPose("hello");
      layoutBubble();
      requestAnimationFrame(() => playAct("enter"));
      setLive(GREETING);
      warm();
      await wait(reduced() ? 300 : 2200);
      if (!alive()) return;
      openChat();
      reset(true);
      await wait(1200);
      for (const line of d.lines) {
        while (pendingRef.current && alive()) await wait(200);
        await wait(reduced() ? 300 : 1800);
        if (!alive()) return;
        // 이용자가 치는 모습을 흉내 낸다
        if (!reduced()) {
          for (let i = 1; i <= line.length; i++) {
            if (!alive()) return;
            setInput(line.slice(0, i));
            await wait(45);
          }
          await wait(350);
        }
        if (!alive()) return;
        await send(line);
        await wait(reduced() ? 300 : 2600);
      }
      if (alive()) setDemo(null);
    };
    const onHash = () => {
      if (DEMOS[window.location.hash]) void run(window.location.hash);
      else {
        // 주소 끝에서 시연 표시를 지우면 진행 중인 시연을 멈춘다
        demoRunRef.current++;
        setDemo(null);
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => {
      demoRunRef.current++;
      window.removeEventListener("hashchange", onHash);
    };
    // 시연은 처음 한 번과 주소 끝이 바뀔 때만 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───── 끌어 옮기기 ─────
  // 마우스는 누른 채 움직이면, 손가락은 길게 누른 뒤 움직이면 해치를 끌어 옮긴다(바로 문지르면 쓰다듬기).
  // 놓은 곳이 칸 윗변 가까이면 그 칸에 올라서고, 아니면 놓은 자리에 선다. 놓은 뒤 한동안은 돌아다니지 않는다.
  const cssPoint = (e: { clientX: number; clientY: number }): XY => {
    const z = zoomOf();
    return { x: e.clientX / z, y: e.clientY / z };
  };

  const startDrag = () => {
    const d = dragRef.current;
    if (!d || d.on || !footRef.current) return;
    // 휴대폰 대화 중에는 해치가 아래 판 위에 앉아 있어 옮기지 않는다
    if (phaseRef.current === "chat" && !isDesktop()) {
      dragRef.current = null;
      return;
    }
    d.on = true;
    moveIdRef.current++;
    const old = tweenRef.current;
    tweenRef.current = null;
    old?.done(false);
    perchRef.current = null;
    if (awayRef.current) {
      clearTimeout(awayRef.current);
      awayRef.current = null;
      setAway(false);
    }
    clearTimeout(timers.current.hint);
    setTip(null);
    try {
      charRef.current?.setPointerCapture(d.id);
    } catch {}
    setDragging(true);
    setPose("cheer");
    playAct("wiggle");
  };

  const endDrag = () => {
    setDragging(false);
    dragDoneRef.current = true;
    clearTimeout(timers.current.dragDone);
    timers.current.dragDone = setTimeout(() => (dragDoneRef.current = false), 300);
    activeAtRef.current = Date.now();
    const f = footRef.current;
    if (!f) return;
    const ph = phaseRef.current;
    if (ph === "chat") {
      // 대화창을 새 자리 곁에 다시 붙인다(창이 들어갈 자리가 없으면 해치가 바닥으로 내려온다)
      layoutChat(false);
      setPose("listen");
      return;
    }
    const spot = perchNear(f, halfMax() * 2);
    if (spot?.perch) {
      footRef.current = spot.foot;
      perchRef.current = { ...spot.perch, left0: rectOf(spot.perch.el).left };
    }
    parkUntilRef.current = Date.now() + PARK_MS;
    setPose("hello");
    playAct("nod");
    if (ph === "greet") layoutBubble();
    else if (Math.random() < 0.5) showTip(pickOne(DROP_LINES));
  };

  const lastHaechi = [...entries].reverse().find((e): e is Extract<Entry, { kind: "haechi" }> => e.kind === "haechi");
  const memo = lastHaechi?.out.memo ?? [];
  const userTurns = entries.filter((e) => e.kind === "user").length;
  const anim = !reduced();
  const flip = face !== (NATIVE_FACE[pose] ?? 1);
  const curW = Math.round(sizeOf(pose).w);
  // 말마다 처음 화면에 그린 시각을 적어 둔다(말풍선 오른쪽 아래 시간)
  const stamp = (id: number) => {
    let t = timesRef.current.get(id);
    if (!t) {
      const d = new Date();
      t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      timesRef.current.set(id, t);
    }
    return t;
  };
  // 대화 기록을 말 한 덩이씩 편다. 같은 사람이 잇달아 한 말 가운데 마지막 것에만 꼬리를 단다(render의 tail)
  type ChatLine = { who: Who | "sys"; render: (tail: boolean) => React.ReactNode };
  const sysLine = (key: string, text: string): ChatLine => ({
    who: "sys",
    render: () => (
      <li key={key} className="hc-sys">
        <span>{text}</span>
      </li>
    ),
  });
  const chatLines: ChatLine[] = [
    sysLine("day", "오늘"),
    {
      who: "bot",
      render: (tail) => (
        <PrivacyMsg key="privacy" open={privacyOpen} onToggle={() => setPrivacyOpen((v) => !v)} time={stamp(0)} />
      ),
    },
  ];
  entries.forEach((e, i) => {
    if (e.kind === "user") {
      const read = entries.slice(i + 1).some((x) => x.kind !== "user");
      chatLines.push({
        who: "me",
        render: (tail) => (
          <Bubble key={`u${e.id}`} who="me" tail={tail} time={stamp(e.id)} read={read}>
            <BubbleText who="me">
              <span className="sr-only">나: </span>
              {e.text}
            </BubbleText>
          </Bubble>
        ),
      });
    } else if (e.kind === "crisis") {
      chatLines.push({ who: "bot", render: (tail) => <CrisisMsg key={`c${e.id}`} id={`hc-e${e.id}`} time={stamp(e.id)} tail={tail} /> });
    } else if (e.kind === "summary") {
      chatLines.push({
        who: "bot",
        render: (tail) => (
          <SummaryMsg
            key={`s${e.id}`}
            id={`hc-e${e.id}`}
            memo={e.out.memo}
            recommend={e.out.recommend}
            draft={e.out.summary}
            time={stamp(e.id)}
            tail={tail}
          />
        ),
      });
    } else {
      if (e.notice) chatLines.push(sysLine(`n${e.id}`, e.notice));
      chatLines.push({
        who: "bot",
        render: (tail) => (
          <Bubble key={`h${e.id}`} who="bot" tail={tail} time={stamp(e.id)}>
            <BubbleText who="bot">
              <span className="sr-only">해치: </span>
              <Typer text={e.out.reply} animate={!!e.fresh && anim} />
            </BubbleText>
          </Bubble>
        ),
      });
      e.out.recommend.forEach((r) =>
        chatLines.push({ who: "bot", render: (tail) => <ServiceMsg key={`r${e.id}-${r.id}`} rec={r} time={stamp(e.id)} tail={tail} /> }),
      );
    }
  });
  if (pending)
    chatLines.push({
      who: "bot",
      render: (tail) => (
        <li key="typing" className={`hc-m hc-m--bot${tail ? " is-tail" : ""}`}>
          <p className="hc-m__b hc-typing" aria-label="해치가 답을 쓰는 중">
            <i />
            <i />
            <i />
          </p>
        </li>
      ),
    });

  const typing = pending && !demo;
  const status = demo ? demo : typing ? "입력 중" : "청년 지원 길잡이";

  return (
    <div className="hc-layer">
      {ringOn > 0 && <div key={ringOn} ref={ringRef} className="hc-ring" aria-hidden="true" />}
      <p className="sr-only" aria-live="polite">
        {live ? `해치: ${live}` : ""}
      </p>

      {showChar && (
        <button
          ref={charRef}
          type="button"
          className={`hc-char${phase === "chat" ? " is-chat" : ""}${away ? " is-away" : ""}${dragging ? " is-drag" : ""}`}
          style={{ width: curW, height: charH }}
          onClick={() => {
            if (dragDoneRef.current) {
              dragDoneRef.current = false;
              return;
            }
            const st = petRef.current;
            if (st.petted) {
              st.petted = false; // 손가락으로 쓰다듬은 뒤 뗀 것은 누르기로 치지 않는다
              return;
            }
            if (phase === "chat") inputRef.current?.focus();
            else if (phase === "roam") toggleMenu();
            else {
              demoRunRef.current++;
              openChat();
            }
          }}
          onPointerEnter={(e) => {
            hoverRef.current = true;
            const st = petRef.current;
            st.anchor = e.clientX;
            st.dir = 0;
            st.flips = [];
            // 처음 올려 두면 한 번만 쓰다듬을 수 있다고 알려 준다
            if (e.pointerType === "mouse" && phaseRef.current === "roam") {
              clearTimeout(timers.current.hint);
              timers.current.hint = setTimeout(() => {
                let shown = false;
                try {
                  shown = sessionStorage.getItem("hc-pet-hint") === "1";
                } catch {}
                if (shown || !hoverRef.current || petRef.current.count || phaseRef.current !== "roam") return;
                showTip(PET_HINT);
                try {
                  sessionStorage.setItem("hc-pet-hint", "1");
                } catch {}
              }, 900);
            }
          }}
          onPointerLeave={() => {
            hoverRef.current = false;
            clearTimeout(timers.current.hint);
          }}
          onPointerDown={(e) => {
            const st = petRef.current;
            st.pressed = true;
            st.petted = false;
            st.anchor = e.clientX;
            st.dir = 0;
            st.flips = [];
            dragDoneRef.current = false;
            clearTimeout(timers.current.hold);
            const f = footRef.current;
            if (!f || (e.pointerType === "mouse" && e.button !== 0)) return;
            const p = cssPoint(e);
            dragRef.current = { id: e.pointerId, type: e.pointerType, start: p, off: { x: f.x - p.x, y: f.y - p.y }, on: false };
            if (e.pointerType === "touch") timers.current.hold = setTimeout(startDrag, HOLD_MS);
          }}
          onPointerUp={(e) => {
            petRef.current.pressed = false;
            clearTimeout(timers.current.hold);
            const d = dragRef.current;
            dragRef.current = null;
            if (d?.on && d.id === e.pointerId) endDrag();
          }}
          onPointerCancel={(e) => {
            petRef.current.pressed = false;
            clearTimeout(timers.current.hold);
            const d = dragRef.current;
            dragRef.current = null;
            if (d?.on && d.id === e.pointerId) endDrag();
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (d && d.id === e.pointerId) {
              const p = cssPoint(e);
              if (!d.on) {
                const moved = Math.hypot(p.x - d.start.x, p.y - d.start.y);
                if (d.type !== "touch" && moved >= DRAG_START) startDrag();
                else if (d.type === "touch" && moved > 10) clearTimeout(timers.current.hold); // 길게 누르기 전에 움직이면 쓰다듬기로 본다
              }
              if (d.on) {
                footRef.current = clampFoot({ x: p.x + d.off.x, y: p.y + d.off.y });
                return;
              }
            }
            onPetMove(e);
          }}
          aria-label={phase === "chat" ? "해치(대화 중)" : "해치와 이야기하기"}
        >
          <span className="hc-rig" ref={rigRef}>
            <span className={`hc-act${dozing ? " is-doze" : pending && phase === "chat" ? " is-think" : pinned && phase !== "chat" ? " is-still" : ""}`} ref={actRef}>
              <span className="hc-face" style={flip ? { transform: "scaleX(-1)" } : undefined}>
                {ghost && <PoseImg pose={ghost.pose} h={charH} className="hc-ghost" key={`g${ghost.id}`} />}
                <PoseImg pose={pose} h={charH} className={anim ? "hc-swap" : undefined} key={pose} />
              </span>
            </span>
          </span>
          {tip && (phase === "roam" || phase === "chat") && (
            <span className="hc-tip" style={{ "--shift": `${tip.shift}px` } as React.CSSProperties} aria-hidden="true">
              {tip.text}
            </span>
          )}
          {hearts.map((h) => (
            <span key={h.id} className="hc-heart" style={{ "--hx": `${h.x}px` } as React.CSSProperties} aria-hidden="true">
              ♥
            </span>
          ))}
          {dozing && (
            <span className="hc-zzz" aria-hidden="true">
              <i>Z</i>
              <i>z</i>
              <i>z</i>
            </span>
          )}
        </button>
      )}

      {phase === "greet" && (
        <section className="hc-bubble" role="dialog" aria-label="해치의 인사" style={bubbleStyle}>
          <div className="hc-bubble__b">
            <b className="hc-bubble__who">해치</b>
            <p>{bubble === "greet" ? GREETING : EXPLAIN}</p>
            <p className="hc-bubble__note">해치를 누르면 언제든 이야기할 수 있어요.</p>
          </div>
          <div className="hc-bubble__keys">
            <button type="button" className="hc-key" onClick={openChat}>
              같이 찾아볼래요
            </button>
            {bubble === "greet" && (
              <button
                type="button"
                className="hc-key"
                onClick={() => {
                  setBubble("explain");
                  setPose("idea");
                  setLive(EXPLAIN);
                }}
              >
                뭘 할 수 있어요?
              </button>
            )}
            <button
              type="button"
              className="hc-key"
              onClick={() => {
                demoRunRef.current++;
                setDemo(null);
                setPhase("roam");
              }}
            >
              혼자 볼게요
            </button>
          </div>
        </section>
      )}

      {phase === "hidden" && (
        <button
          type="button"
          className={`hc-call${callPos?.side === "left" ? " hc-call--left" : ""}`}
          style={callPos ? { top: callPos.top, left: callPos.side === "left" ? leftLimit() : undefined } : undefined} // 왼쪽은 데스크톱 왼쪽 막대 바로 오른쪽
          ref={callRef}
          onClick={() => {
            if (callMovedRef.current) {
              callMovedRef.current = false; // 끌어 옮긴 뒤 따라오는 누르기는 부르기로 치지 않는다
              return;
            }
            openChat();
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const r = rectOf(e.currentTarget);
            const z = zoomOf();
            callMovedRef.current = false;
            callDragRef.current = { id: e.pointerId, sx: e.clientX / z, sy: e.clientY / z, dy: e.clientY / z - r.top, on: false, x: 0, y: 0 };
          }}
          onPointerMove={(e) => {
            const d = callDragRef.current;
            if (!d || d.id !== e.pointerId) return;
            const z = zoomOf();
            const x = e.clientX / z;
            const y = e.clientY / z;
            if (!d.on) {
              if (Math.hypot(x - d.sx, y - d.sy) < DRAG_START) return;
              d.on = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.classList.add("is-drag");
            }
            d.x = x;
            d.y = y;
            const el = e.currentTarget;
            const { vh } = viewport();
            const h = el.offsetHeight;
            const top = Math.max(topLimit() + 8, Math.min(vh - h - 8, y - d.dy));
            el.style.top = `${top}px`;
            const r0 = el.getBoundingClientRect();
            const cur = (r0.left - (parseFloat(el.style.getPropertyValue("--dx")) || 0) * z) / z; // 끌기 전 왼변
            const dx = x - cur - el.offsetWidth / 2;
            el.style.setProperty("--dx", String(dx));
            el.style.transform = `translateX(${dx}px)`;
          }}
          onPointerUp={(e) => {
            const d = callDragRef.current;
            callDragRef.current = null;
            if (!d?.on || d.id !== e.pointerId) return;
            const el = e.currentTarget;
            el.classList.remove("is-drag");
            el.style.transform = "";
            el.style.removeProperty("--dx");
            callMovedRef.current = true;
            const { vw } = viewport();
            const next = { side: d.x < vw / 2 ? ("left" as const) : ("right" as const), top: parseFloat(el.style.top) || 0 };
            setCallPos(next);
            try {
              localStorage.setItem("hc-call-pos", JSON.stringify(next));
            } catch {}
          }}
          onPointerCancel={(e) => {
            callDragRef.current = null;
            e.currentTarget.classList.remove("is-drag");
            e.currentTarget.style.transform = "";
            e.currentTarget.style.removeProperty("--dx");
          }}
        >
          <PoseImg pose="hello" h={44} />
          <span>해치 부르기</span>
          <span className="sr-only">(끌어서 옮길 수 있어요)</span>
        </button>
      )}

      {menu && phase === "roam" && (
        <div className="hc-menu" style={menu} role="group" aria-label="해치 메뉴">
          <button
            type="button"
            onClick={() => {
              closeMenu();
              demoRunRef.current++;
              openChat();
            }}
          >
            이야기하기
          </button>
          <button
            type="button"
            aria-pressed={pinned}
            onClick={() => {
              const next = !pinned;
              setPinned(next);
              try {
                localStorage.setItem("hc-pinned", next ? "1" : "0");
              } catch {}
              closeMenu();
              showTip(next ? "여기 가만히 있을게요." : "다시 천천히 둘러볼게요.");
            }}
          >
            {pinned ? "다시 돌아다니기" : "여기 머물기"}
          </button>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              hide();
            }}
          >
            숨기기
          </button>
        </div>
      )}

      {phase === "chat" && (
        <section
          ref={panelRef}
          className={`hc-panel${panel ? ` hc-panel--${panel.side}` : ""}`}
          style={panel ? ({ left: panel.x, bottom: panel.bottom, maxHeight: panel.maxH } as React.CSSProperties) : undefined}
          aria-label="해치와 대화"
        >
          <header className="hc-head">
            <Face />
            <span className="hc-head__who">
              <b>해치</b>
              <small className={typing ? "is-typing" : undefined}>
                {status}
                {typing && (
                  <span className="hc-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </small>
            </span>
            <span className="hc-head__acts">
              <span className="hc-more">
                <button
                  type="button"
                  className="hc-icon"
                  aria-expanded={moreOpen}
                  aria-controls="hc-more-menu"
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="5" r="1.9" />
                    <circle cx="12" cy="12" r="1.9" />
                    <circle cx="12" cy="19" r="1.9" />
                  </svg>
                  <span className="sr-only">더 보기</span>
                </button>
                {moreOpen && (
                  <span className="hc-more__menu" id="hc-more-menu">
                    <button
                      type="button"
                      disabled={userTurns === 0}
                      onClick={() => {
                        setMoreOpen(false);
                        showSummary();
                      }}
                    >
                      대화 요약 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        reset();
                        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
                      }}
                    >
                      처음부터 다시
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        hide();
                      }}
                    >
                      해치 숨기기
                    </button>
                  </span>
                )}
              </span>
              <button type="button" className="hc-icon hc-icon--sheet" onClick={() => setSheetDown((v) => !v)} aria-expanded={!sheetDown}>
                <Icon name={sheetDown ? "chevron-up" : "chevron-down"} size={20} strokeWidth={2} />
                <span className="sr-only">{sheetDown ? "대화창 올리기" : "대화창 내리기"}</span>
              </button>
              <button type="button" className="hc-icon" onClick={collapse}>
                <Icon name="close" size={20} strokeWidth={2} />
                <span className="sr-only">대화창 접기</span>
              </button>
            </span>
          </header>

          <div className="hc-body">
            {memo.length > 0 && (
              <button type="button" className={`hc-pin${pinOpen ? " is-open" : ""}`} aria-expanded={pinOpen} onClick={() => setPinOpen((v) => !v)}>
                <span className="hc-pin__body">
                  <b>알게 된 것</b>
                  <span className="hc-pin__text">{memo.map((m) => `${m.label} ${m.value}`).join(" · ")}</span>
                </span>
                <Icon name={pinOpen ? "chevron-up" : "chevron-down"} size={18} strokeWidth={2} />
              </button>
            )}

            <ol className="hc-log" ref={logRef} aria-label="대화 기록">
              {chatLines.map((l, i) => l.render(l.who !== "sys" && chatLines[i + 1]?.who !== l.who))}
            </ol>

            {!pending && lastHaechi && lastHaechi.out.chips.length > 0 && (
              <div className="hc-kb" role="group" aria-label="바로 보낼 답">
                {lastHaechi.out.chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      demoRunRef.current++;
                      setDemo(null);
                      // 해치가 내놓는 두 선택지는 서버에 묻지 않고 화면에서 바로 한다
                      if (c === "대화 지우기") {
                        reset();
                        setPrivacyOpen(false);
                        return;
                      }
                      if (c === "개인정보 안내 보기") {
                        setPrivacyOpen(true);
                        requestAnimationFrame(() => document.getElementById("hc-privacy")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }));
                        return;
                      }
                      void send(c);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <form
              className="hc-form"
              onSubmit={(ev) => {
                ev.preventDefault();
                void send(input);
              }}
            >
              {(input.length > LIMITS.inputChars - 100 || userTurns >= LIMITS.turns - 5) && (
                <p className="hc-form__meta">
                  <span>
                    {input.length}/{LIMITS.inputChars}자 · 남은 대화 {Math.max(0, LIMITS.turns - userTurns)}번
                  </span>
                </p>
              )}
              <div className="hc-input">
                <span className="hc-botmenu">
                  <button
                    type="button"
                    className="hc-botmenu__btn"
                    aria-expanded={botMenu}
                    aria-controls="hc-bot-menu"
                    onClick={() => setBotMenu((v) => !v)}
                  >
                    <Icon name="menu" size={18} strokeWidth={2.2} />
                    메뉴
                  </button>
                  {botMenu && (
                    <span className="hc-botmenu__list" id="hc-bot-menu">
                      {STARTERS.map((g) => (
                        <span key={g.title} className="hc-botmenu__group">
                          <span className="hc-botmenu__tit">{g.title}</span>
                          {g.lines.map((line) => (
                            <button
                              key={line}
                              type="button"
                              onClick={() => {
                                setBotMenu(false);
                                demoRunRef.current++;
                                setDemo(null);
                                void send(line);
                              }}
                            >
                              {line}
                            </button>
                          ))}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <label htmlFor="hc-input" className="sr-only">
                  해치에게 보낼 말
                </label>
                <textarea
                  id="hc-input"
                  ref={inputRef}
                  rows={1}
                  maxLength={LIMITS.inputChars}
                  value={input}
                  placeholder="메시지"
                  disabled={userTurns >= LIMITS.turns + 1}
                  onChange={(ev) => {
                    if (demo) {
                      demoRunRef.current++; // 이용자가 직접 쓰기 시작하면 시연을 멈춘다
                      setDemo(null);
                    }
                    setInput(ev.target.value);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) {
                      ev.preventDefault();
                      void send(input);
                    }
                  }}
                />
              </div>
              <button type="submit" className="hc-send" disabled={pending || !input.trim()}>
                <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.99.99 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"
                  />
                </svg>
                <span className="sr-only">보내기</span>
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
