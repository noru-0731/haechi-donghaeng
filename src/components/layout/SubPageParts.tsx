"use client";

// 서브 쪽 틀에서 누르면 움직이는 부분: 왼쪽 메뉴(3단 여닫기), 휴대전화 검정 드롭다운 막대, 소리로 듣기·공유·인쇄 단추.
// PageParts.tsx(서버)가 쓴다. 쪽에서 직접 쓸 일은 없다.
import Link from "@/components/site/SiteLink";
import { useEffect, useId, useRef, useState } from "react";
import type { SideMenu, SideMenuLink } from "@/site/ia";
import { Caret, Icon } from "@/components/icons";
import ReadAloud from "./ReadAloud";

/** PC 왼쪽 메뉴(폭 250): 검정 머리 + 테두리 상자 목록. 3단이 있는 항목은 누르면 여닫힌다. */
export function SideMenuNav({ menu, current }: { menu: SideMenu; current: string }) {
  const hasCur = (links?: SideMenuLink[]) => !!links?.some((l) => l.href === current);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menu.items.filter((it) => it.children?.length).map((it) => [it.href, hasCur(it.children) || it.href === current])),
  );
  const uid = useId();

  return (
    <nav className="rc-lnb" aria-label={`${menu.title} 메뉴`}>
      <h2 className="rc-lnb__tit">{menu.title}</h2>
      <ul className="rc-lnb__list">
        {menu.items.map((it, i) => {
          const kids = it.children ?? [];
          const isCur = it.href === current || hasCur(kids);
          if (!kids.length) {
            return (
              <li className="rc-lnb__item" key={it.href}>
                <Link href={it.href} className={`rc-lnb__link${isCur ? " is-current" : ""}`} aria-current={it.href === current ? "page" : undefined}>
                  {it.label}
                </Link>
              </li>
            );
          }
          const isOpen = !!open[it.href];
          const subId = `${uid}-sub-${i}`;
          return (
            <li className={`rc-lnb__item${isOpen ? " is-open" : ""}`} key={it.href}>
              <button
                type="button"
                className={`rc-lnb__toggle${isCur ? " is-current" : ""}`}
                aria-expanded={isOpen}
                aria-controls={subId}
                onClick={() => setOpen((o) => ({ ...o, [it.href]: !o[it.href] }))}
              >
                {it.label}
                <span className="rc-lnb__chev" aria-hidden="true">
                  <Icon name="chevron-down" size={14} strokeWidth={2} />
                </span>
              </button>
              <ul className="rc-lnb__sub" id={subId} hidden={!isOpen}>
                {kids.map((k) => (
                  <li key={k.href}>
                    <Link href={k.href} aria-current={k.href === current ? "page" : undefined}>
                      {k.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 휴대전화 검정 막대: 지금 쪽 이름 + ▼. 누르면 같은 단 목록이 검정 바탕으로 펼쳐진다. */
export function MobileMenuBar({ label, links, current }: { label: string; links: SideMenuLink[]; current: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  if (!links.length) return null;
  return (
    <div className="rc-mbar" ref={ref}>
      <button type="button" className="rc-mbar__btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span>
          {label}
          <span className="sr-only"> {open ? "닫기" : "열기"}</span>
        </span>
        <Caret up={open} size={16} />
      </button>
      <ul className="rc-mbar__list" id={id} hidden={!open}>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={l.href === current ? "page" : undefined} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 쪽 제목 오른쪽 동그란 단추: 소리로 듣기(ReadAloud.tsx), 공유(링크 복사·카카오톡·네이버·휴대전화 공유 창 메뉴), 인쇄. QR은 뺐다.
 *  소리로 듣기는 한국어 목소리를 찾은 뒤에야 나타나므로 맨 앞에 두어 공유·인쇄 자리가 움직이지 않게 했다.
 *  동그라미 아래에 보이는 이름(페르소나 장점 취합 가11). 휴대전화는 궁능처럼 인쇄 단추를 숨기되, printAlways면 남긴다(한 곳 모아 인쇄 쪽). */
export function PageTools({ title, printAlways = false }: { title: string; printAlways?: boolean }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (t: string) => {
    setMsg(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 3000);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // 공유 메뉴(팀 피드백 4): 링크 복사, 카카오톡(키를 넣은 경우), 네이버, 휴대폰 공유 창
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".rc-share")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pageUrl = () => {
    // 건너뛰기 링크가 붙인 도착 표시(#contents)는 떼고 건넨다. 쪽 안 절 # 는 그대로
    const u = new URL(window.location.href);
    if (decodeURIComponent(u.hash.slice(1)) === "contents") u.hash = "";
    return u.href;
  };
  const copy = async () => {
    setOpen(false);
    const url = pageUrl();
    try {
      await navigator.clipboard.writeText(url);
      say("주소를 복사했습니다.");
    } catch {
      say(`주소: ${url}`);
    }
  };
  const naver = () => {
    setOpen(false);
    const q = `url=${encodeURIComponent(pageUrl())}&title=${encodeURIComponent(title)}`;
    window.open(`https://share.naver.com/web/shareView?${q}`, "_blank", "noopener,noreferrer,width=600,height=640");
  };
  const native = async () => {
    setOpen(false);
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, url: pageUrl() });
    } catch {
      // 이용자가 닫음
    }
  };
  // 카카오톡 공유는 카카오 개발자 앱의 JavaScript 키(NEXT_PUBLIC_KAKAO_JS_KEY)와 사이트 도메인 등록이 있어야 열린다
  const kakao = async () => {
    setOpen(false);
    type KakaoSdk = { isInitialized: () => boolean; init: (k: string) => void; Share: { sendDefault: (o: object) => void } };
    const w = window as Window & { Kakao?: KakaoSdk };
    try {
      if (!w.Kakao) {
        await new Promise<void>((res, rej) => {
          const sc = document.createElement("script");
          sc.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
          sc.crossOrigin = "anonymous";
          sc.onload = () => res();
          sc.onerror = () => rej(new Error("kakao"));
          document.head.appendChild(sc);
        });
      }
      const K = w.Kakao!;
      if (!K.isInitialized()) K.init(kakaoKey);
      const url = pageUrl();
      K.Share.sendDefault({ objectType: "text", text: `${title} | 청년 지원 정보`, link: { webUrl: url, mobileWebUrl: url } });
    } catch {
      say("카카오톡 공유를 열지 못했습니다. 링크 복사를 써 주세요.");
    }
  };

  return (
    <div className="rc-tools">
      <ReadAloud />
      <span className="rc-share">
        <button
          type="button"
          className="rc-tool rc-tool--share"
          onClick={() => setOpen((v) => !v)}
          title="공유하기"
          aria-expanded={open}
          aria-controls="rc-share-menu"
        >
          <span className="rc-tool__circle">
            <Icon name="share" size={30} strokeWidth={1.6} />
          </span>
          <span className="rc-tool__label">
            공유<span className="sr-only">하기</span>
          </span>
        </button>
        {open && (
          <span className="rc-share__menu" id="rc-share-menu">
            <button type="button" onClick={copy}>
              링크 복사
            </button>
            {kakaoKey && (
              <button type="button" onClick={kakao}>
                카카오톡
              </button>
            )}
            <button type="button" onClick={naver}>
              네이버<span className="sr-only">(새 창)</span>
            </button>
            {canShare && (
              <button type="button" onClick={native}>
                다른 앱으로(카카오톡 등)
              </button>
            )}
          </span>
        )}
      </span>
      <button
        type="button"
        className={`rc-tool rc-tool--print${printAlways ? " rc-tool--always" : ""}`}
        onClick={() => window.print()}
        title="인쇄하기"
      >
        <span className="rc-tool__circle">
          <Icon name="print" size={30} strokeWidth={1.6} />
        </span>
        <span className="rc-tool__label">
          인쇄<span className="sr-only">하기</span>
        </span>
      </button>
      <p className="rc-tools__msg" aria-hidden="true">
        {msg}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
