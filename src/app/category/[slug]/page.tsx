// 분야별 목록(서브 쪽 틀). 지금 신청할 수 있는 곳을 먼저, 이번 모집이 끝난 사업을 아래에 둔다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, MENU, categoryOf } from "@/site/ia";
import { SubPage } from "@/components/layout/PageParts";
import { recommendable, servicesIn } from "@/data/services";
import { ServiceRow } from "@/components/site/bits";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: categoryOf(slug)?.label ?? "분야" };
}

const LEAD: Record<string, string> = {
  job: "다시 일이나 진로를 시작하려는 청년을 위한 지원입니다.",
  housing: "청년 월세와 주거비 지원은 서울시 청년몽땅정보통의 주거 메뉴에서 모집 공고를 확인합니다.",
  mind: "우울, 불안, 불면이 이어질 때 상담과 치료로 이어 주는 곳입니다.",
  relation: "외롭거나 사람과의 관계가 끊겼다고 느낄 때 이용할 수 있는 곳입니다.",
  life: "생계가 막혔거나, 가족을 돌보느라 지쳤거나, 지금 위험하다고 느낄 때 연락할 곳입니다.",
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categoryOf(slug);
  if (!cat) notFound();
  const all = servicesIn(cat.slug);
  const open = all.filter(recommendable);
  const closed = all.filter((s) => !recommendable(s));
  const side = MENU.find((m) => m.href === cat.href);
  return (
    <SubPage crumbs={[{ label: cat.label, href: cat.href }]} title={`${cat.label} 지원 한눈에`} side={side} current={cat.href}>
      <p className="hd-lead">{LEAD[cat.slug]}</p>

      {cat.slug === "housing" && (
        <div className="hd-info" data-haechi-target="detail-apply">
          <p>
            이 시제품의 서비스 자료에는 주거 지원 사업을 따로 담지 않았습니다. 청년월세 지원, 주거비 지원 같은 주거 정책은 아래
            청년몽땅정보통의 주거 메뉴에서 찾고, 어디에 물어야 할지 모르겠으면 120다산콜에 전화하세요.
          </p>
        </div>
      )}
      {cat.slug === "life" && (
        <div className="hd-info hd-info--danger" id="crisis">
          <p>
            지금 스스로를 해칠 생각이 들거나 안전이 걱정되면 자살예방상담전화 <b>109</b>나 정신건강위기상담전화 <b>1577-0199</b>에 바로
            전화하세요. 24시간 받습니다. 당장 위험하면 119·112입니다.
          </p>
        </div>
      )}

      <h2 className="hd-section-title">지금 이용할 수 있는 곳</h2>
      <ul className="hd-rows">
        {(cat.slug === "housing" ? [...open, ...servicesIn("life").filter((s) => s.id === "s19")] : open).map((s) => (
          <ServiceRow key={s.id} s={s} />
        ))}
      </ul>

      {closed.length > 0 && (
        <>
          <h2 className="hd-section-title">이번 모집이 끝난 사업</h2>
          <p className="hd-lead hd-lead--small">다음 모집은 청년몽땅정보통 알림으로 확인합니다.</p>
          <ul className="hd-rows hd-rows--closed">
            {closed.map((s) => (
              <ServiceRow key={s.id} s={s} />
            ))}
          </ul>
        </>
      )}
    </SubPage>
  );
}
