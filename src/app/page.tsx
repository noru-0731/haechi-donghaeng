// 첫 쪽. 앞선 공모전 사이트 첫 쪽(궁능유적본부 누리집 main_s0~s2 모양)의 세 칸을 그대로 쓰고 내용만 청년 지원으로 바꿨다.
// 칸 1: 산호색 가운데 띠 + 바로가기 줄 5칸(큰 사진 배너는 뺐다)
// 칸 2: "청년 지원 서비스" 카드 넘기기(지금 이용할 수 있는 곳)
// 칸 3: "지원 정보" 알약 탭 + 목록 + 해치에게 묻기 판
import { CATEGORIES, GUIDE, MENU, SITE_NAME, categoryOf } from "@/site/ia";
import { SERVICES, recommendable, serviceOf, type Service } from "@/data/services";
import HomeHero, { type QuickItem } from "@/components/home/HomeHero";
import HomeCards, { type CardItem } from "@/components/home/HomeCards";
import HomeBoard, { type BoardList } from "@/components/home/HomeBoard";
import s from "@/components/home/home.module.css";

/** 분야 → 색 이름(globals.css의 --rc-area-*) */
const TONE: Record<string, string> = { job: "seoak", housing: "city", mind: "bulguk", relation: "east", life: "bomun" };

const svc = (id: string) => serviceOf(id) as Service;
const labelOf = (x: Service) => categoryOf(x.category)?.label ?? "";

// ── 칸 1: 가운데 띠와 바로가기 줄(큰 사진 배너는 넣을 사진이 없어 뺐다)
// 가운데 띠(궁능: 8곳으로 떠나는 조선왕릉 여행 | 능침특별관람 | 다양한 체험여행)
const BAND = [
  { label: `${SERVICES.filter((x) => !x.crisis).length}곳의 청년 지원 창구`, href: "/category/relation" },
  { label: "24시간 상담 전화", href: "/guide#crisis" },
  { label: "이용 안내", href: "/guide" },
];

// 바로가기 줄 5칸. ▲ 칸은 눌러서 그 분야의 서비스 목록을 펼친다
const QUICK: QuickItem[] = [
  ...CATEGORIES.filter((c) => c.slug !== "life").map((c) => ({
    label: c.label,
    href: c.href,
    icon: c.icon,
    target: c.tile,
    children: MENU.find((m) => m.href === c.href)?.children?.map((x) => ({ label: x.label, href: x.href })),
  })),
  { label: GUIDE.label === "안내" ? "이용 안내" : GUIDE.label, href: "/guide", icon: "guide", target: "tile-guide" },
];

// ── 칸 2: 서비스 카드(위기 전화는 빼고, 지금 이용할 수 있는 곳 먼저)
const CARDS: CardItem[] = SERVICES.filter((x) => !x.crisis)
  .sort((a, b) => Number(recommendable(b)) - Number(recommendable(a)))
  .map((x) => ({
    id: x.id,
    name: x.name,
    area: TONE[x.category],
    areaLabel: labelOf(x),
    open: recommendable(x),
    statusLabel: x.status.kind === "closed" ? "이번 모집 끝" : x.status.kind === "rounds" ? "기수별 모집" : "상시",
    what: x.what,
    target: x.target,
  }));

// ── 칸 3: 목록. 딱지는 분야, 오른쪽은 모집 상태나 연락처
const row = (x: Service, right?: string) => ({
  id: x.id,
  name: x.name,
  dong: right ?? (x.status.kind === "closed" ? "이번 모집 끝" : x.status.kind === "rounds" ? "기수별 모집" : "상시"),
  area: TONE[x.category],
  badge: labelOf(x),
});
const LISTS: BoardList[] = [
  { key: "open", label: "지금 이용할 수 있는 곳", pill: "지금 이용 가능", href: "/category/relation", rows: SERVICES.filter((x) => !x.crisis && recommendable(x)).slice(0, 10).map((x) => row(x)) },
  { key: "tel", label: "24시간 연락처", pill: "24시간 연락처", href: "/guide#crisis", rows: ["s01", "s02", "s08", "s18", "s19"].map((id) => row(svc(id), svc(id).contacts[0]?.tel)) },
  { key: "closed", label: "이번 모집이 끝난 사업", pill: "다음 모집 안내", href: "/category/mind", rows: SERVICES.filter((x) => !recommendable(x)).map((x) => row(x)) },
];

export default function Home() {
  return (
    <div className={s.home} id="contents">
      <HomeHero siteName={SITE_NAME} band={BAND} quick={QUICK} />
      <HomeCards
        title="청년 지원 서비스"
        desc={<>서울 청년이 지금 이용할 수 있는 상담, 일자리, 생활 지원 창구를 한곳에서 안내합니다.</>}
        moreHref="/category/relation"
        items={CARDS}
      />
      <HomeBoard title="지원 정보" lists={LISTS} />
    </div>
  );
}
