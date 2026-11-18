"use client";

// 시연용 막기: 열리는 쪽(site/ia.ts OPEN_PATHS) 밖의 안쪽 링크를 누르면 옮기지 않고 짧은 알림만 띄운다.
// 문서 단계(capture)에서 먼저 받아 Next 링크가 움직이기 전에 멈춘다. 바깥 누리집 링크와 전화 링크는 그대로 둔다.
import { useEffect, useState } from "react";
import { isOpenPath } from "@/site/ia";

const MSG = "시연용 화면이라 이 메뉴는 열리지 않아요. 궁금한 건 해치에게 물어보세요.";

export default function DemoGuard() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (isOpenPath(url.pathname)) return;
      e.preventDefault();
      e.stopPropagation();
      setMsg(MSG);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(""), 2600);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {msg && (
        <p className="hd-toast" aria-hidden="true">
          {msg}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {msg}
      </p>
    </>
  );
}
