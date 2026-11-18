// 검색: 서비스 이름, 하는 일, 대상, 기관에서 낱말을 찾는다. 주거 낱말은 청년몽땅정보통으로 이어 준다.
import type { Metadata } from "next";
import { SubPage } from "@/components/layout/PageParts";
import { GUIDE } from "@/site/ia";
import { SERVICES } from "@/data/services";
import { CATEGORIES } from "@/site/ia";
import { ServiceRow } from "@/components/site/bits";

export const metadata: Metadata = { title: "검색" };

const ALIAS: Record<string, string[]> = {
  월세: ["주거"],
  주거: ["주거"],
  집: ["주거"],
  심리상담: ["상담"],
  "고립·은둔": ["고립", "은둔"],
  고립: ["고립"],
  은둔: ["은둔"],
  일자리: ["일", "진로", "구직"],
  취업: ["일", "진로", "구직"],
  가족돌봄: ["가족"],
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 50) ?? "";
  const words = q ? [q, ...(ALIAS[q] ?? [])] : [];
  const hits = words.length
    ? SERVICES.filter((s) => {
        const cat = CATEGORIES.find((c) => c.slug === s.category);
        const hay = [s.name, s.what, s.target, s.org, cat?.label ?? "", cat?.hint ?? ""].join(" ");
        return words.some((w) => hay.includes(w));
      })
    : [];
  return (
    <SubPage crumbs={[{ label: "검색", href: "/search" }]} title="검색 결과" side={GUIDE} current="/search" tools={false}>
      <form action="/search" className="hd-search hd-search--inline" role="search" data-haechi-target="search">
        <label htmlFor="q2" className="sr-only">
          찾을 지원
        </label>
        <input id="q2" name="q" type="search" defaultValue={q} placeholder="정책 이름이나 궁금한 것을 입력하세요" />
        <button type="submit" className="krds-btn medium primary">
          검색
        </button>
      </form>
      {q && (
        <p className="hd-lead">
          ‘{q}’ 검색 결과 {hits.length}건
        </p>
      )}
      <ul className="hd-rows">
        {hits.map((s) => (
          <ServiceRow key={s.id} s={s} />
        ))}
      </ul>
      {q && hits.length === 0 && (
        <div className="hd-info">
          <p>
            찾는 지원이 이 누리집 자료에 없습니다. 서울시 청년 정책은 청년몽땅정보통에서 찾을 수 있고, 어디에 물어야 할지 모르겠으면
            120다산콜(02-120)에 전화하세요. 화면 가장자리의 해치에게 물어봐도 됩니다.
          </p>
        </div>
      )}
    </SubPage>
  );
}
