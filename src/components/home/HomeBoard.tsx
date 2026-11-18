"use client";
// 첫 쪽 칸 3(궁능 main_s2 "궁·능 소통"): 제목, 알약 탭과 큰 +, 왼쪽 흰 카드 안 목록([분야] 이름 … 상태),
// 오른쪽 흰 카드 = 해치에게 묻기 판(누르면 해치 대화창이 열린다). 앞선 공모전 사이트의 게시판 칸을 그대로 옮기고 지도 판만 바꿨다.
// 아래쪽 파란 띠 바탕, 뒤에 흐린 큰 영문 "SEOUL YOUTH".
import { useId, useState } from "react";
import Link from "@/components/site/SiteLink";
import { Icon } from "@/components/icons";
import { MoreLink } from "./bits";
import s from "./home.module.css";

export type BoardRow = { id: string; name: string; dong: string; area: string; badge: string };
/** label = 온 이름(목록·더 보기 이름), pill = 알약에 보이는 글(없으면 label) */
export type BoardList = { key: string; label: string; pill?: string; href: string; rows: BoardRow[]; hub?: boolean };

/** 해치 대화창 열기(HaechiLayer가 이 사건을 듣는다) */
const askHaechi = () => window.dispatchEvent(new CustomEvent("haechi:open"));

export default function HomeBoard({ title, lists }: { title: string; lists: BoardList[] }) {
  const [cur, setCur] = useState(lists[0]?.key);
  const list = lists.find((l) => l.key === cur) ?? lists[0];
  const panelId = useId();

  return (
    <section className={s.boardSec} aria-labelledby="home-board-title" data-haechi-target="popular">
      <p className={s.ghost} aria-hidden="true">
        SEOUL YOUTH
      </p>
      <div className={`${s.inner} ${s.board}`}>
        <div className={s.boardLeft}>
          <h2 id="home-board-title" className={s.secTitle}>
            {title}
          </h2>
          <div className={s.pills} role="group" aria-label={`${title} 목록 고르기`}>
            {lists.map((l) => (
              <button
                key={l.key}
                type="button"
                className={s.pill}
                aria-pressed={l.key === list.key}
                aria-controls={panelId}
                onClick={() => setCur(l.key)}
              >
                {l.pill ?? l.label}
              </button>
            ))}
          </div>
          <MoreLink href={list.href} label={`${list.label} 더 보기`} className={s.boardMore} />

          <ul className={s.boardList} id={panelId} aria-label={list.label}>
            {list.rows.map((r) => (
              <li key={r.id} className={s.boardRow}>
                <Link href={`/services/${r.id}`} className={s.boardLink}>
                  <span
                    className={`${s.badge}${list.hub ? " " + s.badgeHub : ""}`}
                    style={list.hub ? undefined : ({ "--c": `var(--rc-area-${r.area})` } as React.CSSProperties)}
                  >
                    {r.badge}
                  </span>
                  <span className={s.boardName}>{r.name}</span>
                  <span className={s.boardDong}>{r.dong}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={s.boardRight}>
          <button type="button" className={`${s.mapCard} ${s.askCard}`} onClick={askHaechi} data-haechi-perch>
            <div className={s.askBox}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 작은 투명 그림 */}
              <img src="/haechi/hello.png" alt="" className={s.askHaechi} />
              <p className={s.askTit}>어디서부터 찾아야 할지 모르겠다면</p>
              <p className={s.askTxt}>서울시 캐릭터 해치가 메뉴 위치를 짚어 주고, 이야기를 듣고 맞는 기존 서비스로 이어 줘요.</p>
            </div>
            <div className={s.mapBar}>
              해치에게 물어보기
              <Icon name="arrow-right" size={22} strokeWidth={2} />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
