"use client";
// 첫 쪽 칸 2(궁능 main_s1 "궁·능 행사"): 제목·설명, 오른쪽 넘기기 조작(‹ 3 ── 19 › ‖)과 큰 +,
// 세로로 긴 카드 가로 넘기기(가운데 카드를 크게·파란 테두리로). 끝에서 처음으로 이어진다. 앞선 공모전 사이트의 카드 넘기기를 그대로 옮겼다.
// - 카드 위 탭 두 개: {분야} / 모집 상태. 카드 글: 서비스 이름, "대상 : …".
// - 사진 칸은 넣을 사진이 없어 뺐고(2026-10-19 사용자 결정), 그 자리에 하는 일 두 줄을 둔다.
// - 자동 넘김은 멈출 수 있고, 마우스를 올리거나 초점이 안에 있으면 잠시 멈추고, 움직임 줄이기 설정이면 켜지지 않는다.
// - 키보드: 카드에 초점이 오면 그 카드가 가운데로 온다(가려진 카드로 Tab이 들어가도 보이게).
import { useCallback, useId, useRef, useState } from "react";
import Link from "@/components/site/SiteLink";
import { Icon } from "@/components/icons";
import { MoreLink, useReducedMotion } from "./bits";
import s from "./home.module.css";

export type CardItem = {
  id: string;
  name: string;
  /** 분야 색 이름(globals.css --rc-area-*) */
  area: string;
  areaLabel: string;
  /** 지금 신청·이용할 수 있는지 */
  open: boolean;
  statusLabel: string;
  what: string;
  target: string;
};

const AUTO_MS = 5000;
/** 가운데에서 이만큼(칸 수) 떨어진 카드까지 그린다. 더 먼 카드는 숨긴다(끝↔처음 이어 붙일 때 화면을 가로지르지 않게). */
const REACH = 3;

export default function HomeCards({
  title,
  desc,
  moreHref,
  items,
}: {
  title: string;
  desc: React.ReactNode;
  moreHref: string;
  items: CardItem[];
}) {
  const n = items.length;
  // 처음 가운데 카드는 셋째(궁능 첫 화면처럼 "3"). 왼쪽 두 칸도 사진 있는 카드가 오게.
  const [idx, setIdx] = useState(Math.min(2, Math.max(0, items.length - 1)));
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const reduce = useReducedMotion();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const running = playing && !hold && !reduce && n > 1;
  const go = useCallback((i: number) => setIdx(((i % n) + n) % n), [n]);

  /** 가운데(idx)에서 i번 카드까지 떨어진 칸 수(-n/2 ~ n/2) */
  const offsetOf = (i: number) => {
    let d = (((i - idx) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  return (
    <section className={s.cardsSec} aria-labelledby="home-cards-title" data-haechi-perch>
      <div className={s.inner}>
        <div className={s.head}>
          <h2 id="home-cards-title" className={s.secTitle}>
            {title}
          </h2>
          <p className={s.secText}>{desc}</p>
          <MoreLink href={moreHref} label={`${title} 더 보기`} className={s.headMore} />

          {n > 1 && (
            <div className={s.cardsCtrl}>
              <button type="button" className={s.ctrlBtn} aria-controls={listId} onClick={() => go(idx - 1)}>
                {/* 궁능 화살표 8×14: 24칸 그림의 꺾쇠 부분만 잘라 그린다 */}
                <Icon name="chevron-left" viewBox="8 5 8 14" width={8} height={14} strokeWidth={1.6} />
                <span className="sr-only">이전 서비스</span>
              </button>
              <span className={s.ctrlCount} aria-live={running ? "off" : "polite"} aria-atomic="true">
                <span className={s.ctrlNum}>{idx + 1}</span>
                <span className={s.ctrlBar} aria-hidden="true">
                  <span style={{ width: `${100 / n}%`, left: `${(100 * idx) / n}%` }} />
                </span>
                <span className="sr-only">/</span>
                <span className={s.ctrlNum}>{n}</span>
              </span>
              <button type="button" className={s.ctrlBtn} aria-controls={listId} onClick={() => go(idx + 1)}>
                <Icon name="chevron-right" viewBox="8 5 8 14" width={8} height={14} strokeWidth={1.6} />
                <span className="sr-only">다음 서비스</span>
              </button>
              {!reduce && (
                <button type="button" className={`${s.ctrlBtn} ${s.ctrlStop}`} onClick={() => setPlaying(!playing)}>
                  <Icon name={playing ? "pause" : "play"} size={20} strokeWidth={2.6} />
                  <span className="sr-only">{playing ? "자동 넘김 멈춤" : "자동 넘김 시작"}</span>
                </button>
              )}
              {/* 보이지 않는 시계: 애니메이션이 끝나면 다음 카드로. 멈추면 시계도 멈춘다. */}
              {!reduce && (
                <span
                  key={idx}
                  className={s.timer}
                  style={{ animationDuration: `${AUTO_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                  onAnimationEnd={() => go(idx + 1)}
                  aria-hidden="true"
                />
              )}
            </div>
          )}
        </div>

        <div
          className={s.cardsView}
          ref={rootRef}
          role="region"
          aria-roledescription="넘기기"
          aria-label={`${title} 카드`}
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget as Node)) setHold(false);
          }}
        >
          <ul className={s.cardTrack} id={listId}>
            {items.map((it, i) => {
              const d = offsetOf(i);
              const far = Math.abs(d) > REACH;
              const cls = `${s.cardItem}${d === 0 ? " " + s.isCenter : ""}${far ? " " + s.isFar : ""}`;
              const style = {
                "--sgn": Math.sign(d),
                "--abs": Math.abs(d),
                "--c": `var(--rc-area-${it.area})`,
              } as React.CSSProperties;
              return (
                <li key={it.id} className={cls} style={style} aria-hidden={far || undefined} inert={far}>
                  <div className={s.cardTabs}>
                    <span className={`${s.cardTab} ${s.cardTabArea}`}>{it.areaLabel}</span>
                    <span className={`${s.cardTab} ${it.open ? s.cardTabOn : s.cardTabOff}`}>{it.statusLabel}</span>
                  </div>
                  {/* 5초마다 옆으로 넘어가는 카드라 해치가 올라서지 않는다(올라서면 넘어갈 때마다 뛰어내려야 해 정신없다) */}
                  <Link href={`/services/${it.id}`} className={s.card} onFocus={() => d !== 0 && setIdx(i)}>
                    <span className={s.cardTxt}>
                      <span className={s.cardName}>{it.name}</span>
                      <span className={s.cardWhat}>{it.what}</span>
                      <span className={s.cardAddr}>
                        <span className={s.cardAddrKey}>대상 :</span> {it.target}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
