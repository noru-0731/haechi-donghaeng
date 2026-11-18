"use client";
// 첫 쪽 칸 1(궁능 main_s0): 산호색 가운데 띠 → 바로가기 줄 5칸. 앞선 공모전 사이트의 첫 쪽을 그대로 옮겼다.
// - 큰 사진 넘기기 배너는 넣을 사진이 없어 뺐다(2026-10-19 사용자 결정: 사진 칸은 모두 지우고 촘촘하게).
// - 바로가기 줄의 ▲ 칸은 눌러야 펼쳐진다(마우스 올림으로 열지 않음). Esc·바깥 누름으로 닫힌다.
import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/site/SiteLink";
import { Icon, type IconName } from "@/components/icons";
import { Ph } from "@/components/layout/Ph";
import s from "./home.module.css";

export type QuickItem = {
  label: string;
  href: string;
  icon: IconName;
  children?: { label: string; href: string }[];
  /** 궁능에 짝이 없어 새로 지은 이름(Ph 로 적어 두는 기록. 09-27부터 화면 표시 없음) */
  ph?: boolean;
  /** 해치가 가리킬 때 쓰는 이름 */
  target?: string;
};

export default function HomeHero({
  siteName,
  band,
  quick,
}: {
  siteName: string;
  band: { label: string; href: string }[];
  quick: QuickItem[];
}) {
  return (
    <section className={`${s.hero} ${s.heroCompact}`} aria-labelledby="home-h1">
      <h1 id="home-h1" className="sr-only">
        {siteName}
      </h1>

      {/* 산호색 가운데 띠 */}
      <nav className={s.band} aria-label="청년 지원 바로가기">
        <ul className={s.bandList}>
          {band.map((b) => (
            <li key={b.href}>
              <Link href={b.href} className={s.bandLink}>
                {b.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <QuickRow items={quick} />
    </section>
  );
}

/** 바로가기 줄 5칸. ▲ 칸은 단추(눌러서 위로 펼침), 나머지는 링크. */
function QuickRow({ items }: { items: QuickItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const popRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const popId = useId();

  // 펼치면 첫 링크로 초점을 옮긴다(펼침판은 줄 밖에 있어 휴대전화 가로 넘기기 칸에 잘리지 않는다).
  // 줄이 화면 위쪽에 있으면 위로 열린 판이 고정 머리 밑에 가려지므로, 먼저 판이 머리 아래에 다 보이게 쪽을 옮긴다
  // (머리 높이만큼 비키는 값은 home.module.css .quickPop의 scroll-margin-top).
  useEffect(() => {
    if (open === null) return;
    const pop = popRef.current;
    pop?.scrollIntoView({ block: "nearest" });
    pop?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (focusTo: number | null) => {
    setOpen(null);
    if (focusTo !== null) itemRefs.current[focusTo]?.focus();
  };

  const onPopKey = (e: React.KeyboardEvent) => {
    if (open === null) return;
    const links = Array.from(popRef.current?.querySelectorAll<HTMLElement>("a") ?? []);
    const first = links[0];
    const last = links[links.length - 1];
    if (e.key === "Escape") {
      e.preventDefault();
      close(open);
    } else if (e.key === "Tab" && e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      close(open);
    } else if (e.key === "Tab" && !e.shiftKey && document.activeElement === last) {
      if (open + 1 < items.length) {
        e.preventDefault();
        close(open + 1);
      } else setOpen(null);
    }
  };

  const cur = open !== null ? items[open] : null;

  return (
    <nav className={s.quick} aria-label="자주 찾는 메뉴" ref={rowRef}>
      <ul className={s.quickList}>
        {items.map((q, i) => {
          const body = (
            <>
              <Icon name={q.icon} size={36} strokeWidth={1.5} className={s.quickIcon} />
              <span>{q.ph ? <Ph>{q.label}</Ph> : q.label}</span>
            </>
          );
          return (
            <li key={q.href + i} className={s.quickItem}>
              {q.children ? (
                <button
                  type="button"
                  className={s.quickLink}
                  data-haechi-target={q.target}
                  aria-expanded={open === i}
                  aria-controls={open === i ? popId : undefined}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {body}
                  <Icon name={open === i ? "chevron-down" : "chevron-up"} size={16} strokeWidth={2.4} className={s.quickCaret} />
                  <span className="sr-only"> 열기</span>
                </button>
              ) : (
                <Link
                  href={q.href}
                  className={s.quickLink}
                  data-haechi-target={q.target}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {cur?.children && (
        <div
          id={popId}
          className={s.quickPop}
          ref={popRef}
          style={{ "--i": open } as React.CSSProperties}
          onKeyDown={onPopKey}
        >
          <p className={s.quickPopTit}>{cur.label}</p>
          <ul>
            {cur.children.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className={s.quickPopLink} onClick={() => setOpen(null)}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
