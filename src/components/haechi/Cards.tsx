"use client";

// 해치 대화창의 말 한 덩이(텔레그램 대화 화면 모양): 말풍선, 추천 서비스 말(링크 미리보기 모양), 위기 연락처 말, 요약 말.
// 말풍선 아래 단추 줄(.hc-m__keys)은 텔레그램 봇의 말에 붙는 단추와 같은 자리다.
// 추천 말에서 AI가 정하는 것은 '맞는 이유' 한 줄뿐이고, 나머지 값은 모두 서비스 자료(data/services.ts)에서 온다.
import Link from "@/components/site/SiteLink";
import { useId, useRef, useState, type ReactNode } from "react";
import { serviceOf, type Contact } from "@/data/services";
import { sourceOf } from "@/data/sources";
import { PRIVACY_POINTS, PRIVACY_SHORT } from "@/lib/haechi/privacy";
import type { MemoItem, Recommend } from "@/lib/haechi/types";

export type Who = "me" | "bot";

/** 보낸 말의 체크 표시: 하나는 보냄, 둘은 해치가 읽고 답함 */
function Ticks({ read }: { read?: boolean }) {
  return (
    <svg className="hc-m__ticks" viewBox="0 0 18 12" width={17} height={11} aria-hidden="true" focusable="false">
      <path d="M1 6.5l3.2 3.2L11 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {read && <path d="M7.4 9.2l0.5 0.5L14.8 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** 말풍선 한 개. tail이면 무리의 마지막 말이라 꼬리를 단다. keys는 말풍선 아래 단추 줄 */
export function Bubble({
  who,
  tail,
  time,
  read,
  keys,
  wide,
  id,
  children,
}: {
  who: Who;
  tail?: boolean;
  time: string;
  read?: boolean;
  keys?: ReactNode;
  wide?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <li className={`hc-m hc-m--${who}${tail ? " is-tail" : ""}${wide ? " is-wide" : ""}`} id={id}>
      <div className="hc-m__b">
        {children}
        <span className="hc-m__meta" aria-hidden="true">
          {time}
          {who === "me" && <Ticks read={read} />}
        </span>
      </div>
      {keys && <div className="hc-m__keys">{keys}</div>}
    </li>
  );
}

/** 글 말풍선의 본문. 끝에 시간 칸만큼 빈틈을 두어 마지막 줄이 시간과 겹치지 않게 한다 */
export function BubbleText({ children, who }: { children: ReactNode; who: Who }) {
  return (
    <p className="hc-m__text">
      {children}
      <span className={`hc-m__gap${who === "me" ? " hc-m__gap--me" : ""}`} aria-hidden="true" />
    </p>
  );
}

function Tel({ c }: { c: Contact }) {
  return (
    <li className="hc-tel">
      <span>{c.label}</span>
      <a href={`tel:${c.tel.replace(/[^0-9]/g, "")}`}>{c.tel}</a>
      {c.how && <small>{c.how}</small>}
    </li>
  );
}

const telHref = (tel: string) => `tel:${tel.replace(/[^0-9]/g, "")}`;

export function ServiceMsg({ rec, time, tail }: { rec: Recommend; time: string; tail?: boolean }) {
  const s = serviceOf(rec.id);
  if (!s) return null;
  const src = s.sources.map(sourceOf).filter((x) => !!x);
  const keys = (
    <>
      {s.url && (
        <a className="hc-key" href={s.url.href} target="_blank" rel="noopener noreferrer">
          {s.url.label}
          <span className="hc-key__out" aria-hidden="true">
            ↗
          </span>
          <span className="sr-only">(새 창)</span>
        </a>
      )}
      <Link className="hc-key" href={`/services/${s.id}`}>
        이 누리집에서 자세히
      </Link>
    </>
  );
  return (
    <Bubble who="bot" tail={tail} time={time} keys={keys} wide>
      <article className="hc-pv" aria-label={s.name}>
        <div className="hc-pv__card">
          <p className="hc-pv__site">{s.org}</p>
          <h3 className="hc-pv__title">{s.name}</h3>
          <p className="hc-pv__desc">
            <b>맞는 이유</b> {rec.reason}
          </p>
        </div>
        <dl className="hc-pv__dl">
          <div>
            <dt>대상</dt>
            <dd>{s.target}</dd>
          </div>
          <div>
            <dt>시작 방법</dt>
            <dd>{s.start}</dd>
          </div>
          <div>
            <dt>운영 시간</dt>
            <dd>{s.hours}</dd>
          </div>
          <div>
            <dt>모집</dt>
            <dd>{s.status.text}</dd>
          </div>
          {s.contacts.length > 0 && (
            <div>
              <dt>연락처</dt>
              <dd>
                <ul className="hc-tels">
                  {s.contacts.map((c) => (
                    <Tel key={c.tel} c={c} />
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
        {src.length > 0 && (
          <p className="hc-pv__src">출처: {src.map((x) => x.org).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</p>
        )}
      </article>
    </Bubble>
  );
}

const CRISIS_IDS = ["s01", "s02", "s04"] as const;

export function CrisisMsg({ time, tail, id }: { time: string; tail?: boolean; id?: string }) {
  const chat = serviceOf("s03");
  const tels = CRISIS_IDS.flatMap((sid) => serviceOf(sid)?.contacts ?? []);
  const keys = (
    <>
      {tels.slice(0, 2).map((c) => (
        <a key={c.tel} className="hc-key hc-key--danger" href={telHref(c.tel)}>
          {c.tel} 전화하기
        </a>
      ))}
    </>
  );
  return (
    <Bubble who="bot" tail={tail} time={time} keys={keys} wide id={id}>
      <article className="hc-pv hc-pv--danger" aria-label="지금 바로 연락할 곳" role="alert">
        <div className="hc-pv__card">
          <p className="hc-pv__site">24시간 상담 전화</p>
          <h3 className="hc-pv__title">지금 바로 연락할 곳</h3>
          <p className="hc-pv__desc">혼자 견디지 않아도 돼요. 아래 전화는 24시간 받아요.</p>
        </div>
        <ul className="hc-tels hc-tels--big">
          {tels.map((c) => (
            <Tel key={c.tel} c={c} />
          ))}
        </ul>
        {chat?.url && (
          <p className="hc-pv__note">
            전화가 어렵다면{" "}
            <a href={chat.url.href} target="_blank" rel="noopener noreferrer">
              서울시 자살예방센터 마음이
              <span className="sr-only">(새 창)</span>
            </a>
            에서 글로 시작해 상담사와 이어질 수 있어요.
          </p>
        )}
      </article>
    </Bubble>
  );
}

export function SummaryMsg({
  memo,
  recommend,
  draft,
  time,
  tail,
  id,
}: {
  memo: MemoItem[];
  recommend: Recommend[];
  draft: string;
  time: string;
  tail?: boolean;
  id?: string;
}) {
  const names = recommend.map((r) => serviceOf(r.id)?.name).filter(Boolean) as string[];
  const initial = [
    draft,
    memo.length ? `\n[알게 된 것]\n${memo.map((m) => `- ${m.label}: ${m.value}`).join("\n")}` : "",
    names.length ? `\n[알아보는 서비스]\n${names.map((n) => `- ${n}`).join("\n")}` : "",
  ]
    .join("\n")
    .trim();
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const fid = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("복사했어요. 상담이나 신청할 때 붙여 넣으면 돼요.");
    } catch {
      // 복사가 막힌 브라우저: 글을 선택해 두고 직접 복사하게 한다
      area.current?.focus();
      area.current?.select();
      setMsg("복사가 막혀 있어 글을 선택해 두었어요. 길게 누르거나 Ctrl+C로 복사해 주세요.");
    }
  };
  const keys = (
    <>
      <button type="button" className="hc-key" onClick={copy}>
        요약 복사
      </button>
      <button type="button" className="hc-key" onClick={() => setText(initial)}>
        처음 요약으로
      </button>
    </>
  );
  return (
    <Bubble who="bot" tail={tail} time={time} keys={keys} wide id={id}>
      <article className="hc-pv" aria-label="대화 요약">
        <div className="hc-pv__card">
          <p className="hc-pv__site">상담·신청 때 보여 줄 글</p>
          <h3 className="hc-pv__title">대화 요약</h3>
          <p className="hc-pv__desc">틀린 곳은 직접 고칠 수 있어요. 담당자에게 자동으로 보내지 않아요.</p>
        </div>
        <label className="sr-only" htmlFor={fid}>
          요약 고치기
        </label>
        <textarea className="hc-pv__edit" id={fid} ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={7} />
        <p className="hc-pv__note" role="status">
          {msg}
        </p>
      </article>
    </Bubble>
  );
}

/** 대화창 맨 위 개인정보·AI 이용 안내. 누르면 자세한 내용이 펼쳐진다 */
export function PrivacyMsg({ open, onToggle, time }: { open: boolean; onToggle: () => void; time: string }) {
  const keys = (
    <>
      <button type="button" className="hc-key" aria-expanded={open} aria-controls="hc-privacy-more" onClick={onToggle}>
        {open ? "접기" : "자세히 보기"}
      </button>
      <Link className="hc-key" href="/guide#privacy">
        이용 안내에서 보기
      </Link>
    </>
  );
  return (
    <Bubble who="bot" time={time} keys={keys} wide id="hc-privacy">
      <article className="hc-pv" aria-label="개인정보·AI 이용 안내">
        <div className="hc-pv__card">
          <p className="hc-pv__site">개인정보·AI 이용 안내</p>
          <p className="hc-pv__desc">{PRIVACY_SHORT}</p>
        </div>
        {open && (
          <ul className="hc-pv__list" id="hc-privacy-more">
            {PRIVACY_POINTS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </article>
    </Bubble>
  );
}
