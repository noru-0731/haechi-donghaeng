// 누리집 화면 조각: 모집 상태 딱지, 전화번호(글자로도 보임), 서비스 목록 줄.
import Link from "@/components/site/SiteLink";
import type { Contact, Service } from "@/data/services";
import { Icon } from "@/components/icons";

export function StatusBadge({ s }: { s: Service }) {
  const k = s.status.kind;
  const label = k === "closed" ? "이번 모집 끝" : k === "rounds" ? "기수별 모집" : s.crisis ? "24시간" : "상시";
  return <span className={`hd-badge hd-badge--${k}`}>{label}</span>;
}

/** 전화번호는 눌러지지 않는 기기도 있어 번호를 글자로 함께 보인다 */
export function Tel({ c }: { c: Contact }) {
  const digits = c.tel.replace(/[^0-9]/g, "");
  return (
    <span className="hd-tel">
      <span className="hd-tel__label">{c.label}</span>
      <a href={`tel:${digits}`} className="hd-tel__num">
        <Icon name="phone" size={18} />
        {c.tel}
      </a>
      {c.how && <span className="hd-tel__how">{c.how}</span>}
    </span>
  );
}

export function ServiceRow({ s }: { s: Service }) {
  return (
    <li className="hd-row">
      <Link href={`/services/${s.id}`} className="hd-row__link">
        <span className="hd-row__head">
          <strong>{s.name}</strong>
          <StatusBadge s={s} />
        </span>
        <span className="hd-row__org">{s.org}</span>
        <span className="hd-row__what">{s.what}</span>
        <span className="hd-row__target">대상: {s.target}</span>
      </Link>
    </li>
  );
}

export function OutLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only">(새 창)</span>
    </a>
  );
}
