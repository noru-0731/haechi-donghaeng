// 서비스 상세(서브 쪽 틀). 모든 값은 data/services.ts에서 온다. 맨 아래에 출처 줄을 둔다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES, serviceOf } from "@/data/services";
import { sourceOf } from "@/data/sources";
import { MENU, categoryOf } from "@/site/ia";
import { SubPage } from "@/components/layout/PageParts";
import { OutLink, StatusBadge, Tel } from "@/components/site/bits";
import { Icon } from "@/components/icons";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: serviceOf(id)?.name ?? "서비스" };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = serviceOf(id);
  if (!s) notFound();
  const cat = categoryOf(s.category);
  const sources = s.sources.map(sourceOf).filter((x) => !!x);
  const side = MENU.find((m) => m.href === cat?.href);
  const crumbs = [...(cat ? [{ label: cat.label, href: cat.href }] : []), { label: s.name, href: `/services/${s.id}` }];
  return (
    <SubPage crumbs={crumbs} title={s.name} side={side}>
      <p className="hd-detail__org">{s.org}</p>
      <p className="hd-detail__status">
        <StatusBadge s={s} /> {s.status.text}
        {s.status.kind === "closed" && <> {s.status.next}</>}
      </p>
      <p className="hd-lead">{s.what}</p>

      <dl className="hd-detail">
        <div data-haechi-target="detail-target">
          <dt>대상 조건</dt>
          <dd>
            {s.target}
            {s.income && <span className="hd-detail__sub">소득: {s.income}</span>}
          </dd>
        </div>
        <div data-haechi-target="detail-apply">
          <dt>시작 방법</dt>
          <dd>
            {s.start}
            {s.steps && (
              <ol className="hd-steps">
                {s.steps.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            )}
            {s.after && <span className="hd-detail__sub">이후 절차: {s.after}</span>}
          </dd>
        </div>
        <div>
          <dt>운영 시간</dt>
          <dd>
            {s.hours}
            {s.place && <span className="hd-detail__sub">장소: {s.place}</span>}
          </dd>
        </div>
        <div data-haechi-target="detail-contact">
          <dt>연락처</dt>
          <dd>
            {s.contacts.length > 0 ? (
              <span className="hd-tels">
                {s.contacts.map((c) => (
                  <Tel key={c.tel} c={c} />
                ))}
              </span>
            ) : (
              "전화 창구 없음. 공식 누리집을 이용합니다."
            )}
          </dd>
        </div>
        {s.programs && (
          <div>
            <dt>함께 이용하는 프로그램</dt>
            <dd>
              <ul className="hd-bullets">
                {s.programs.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {s.note && (
          <div>
            <dt>알아 둘 점</dt>
            <dd>{s.note}</dd>
          </div>
        )}
      </dl>

      {s.url && (
        <p className="hd-detail__go">
          <OutLink href={s.url.href} className="krds-btn large primary">
            {s.url.label} 열기
            <Icon name="external" size={20} />
          </OutLink>
        </p>
      )}

      <section className="hd-source" data-haechi-target="detail-source" aria-label="출처">
        <h2>출처</h2>
        {sources.length > 0 ? (
          <ul>
            {sources.map((x) => (
              <li key={x.id}>
                {x.org}, <OutLink href={x.url}>{x.title}</OutLink>
                {x.date && `, ${x.date}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>널리 알려진 긴급 번호라 따로 적은 출처가 없습니다.</p>
        )}
        <p className="hd-source__date">2026년 10월 18일 기준으로 정리했습니다. 지원 대상 여부는 각 기관이 정합니다.</p>
      </section>
    </SubPage>
  );
}
