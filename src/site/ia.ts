// 사이트 정보 구조(메뉴). 화면 틀은 앞선 공모전 사이트의 궁능 누리집 모양 틀을 그대로 쓰고, 내용만 청년 지원으로 바꿨다.
// 1차 = 머리 메인 메뉴(분야 여섯), 2차 = 펼침판·왼쪽 메뉴(그 분야의 서비스 상세 쪽).
// 시연에서 열리는 쪽은 OPEN_PATHS뿐이다. 나머지 안쪽 링크는 DemoGuard가 막고 안내만 띄운다.
import type { IconName } from "@/components/icons";
import { SERVICES } from "@/data/services";

export type NavItem = {
  label: string;
  href: string;
  /** 1차 메뉴 펼침판 회색 상자의 둘째 줄 */
  desc?: string;
  children?: NavItem[];
};

/** 서브 쪽 왼쪽 메뉴. title = 검정 머리 상자 글자, items = 2단, children = 3단 */
export type SideMenuLink = { label: string; href: string };
export type SideMenuItem = { label: string; href: string; children?: SideMenuLink[] };
export type SideMenu = { title: string; items: SideMenuItem[] };

export const SITE_NAME = "청년 지원 정보";
export const SITE_DESC =
  "2026 청년취업사관학교 해커톤 출품 시제품. 정부 누리집 틀 위에서 서울시 캐릭터 해치가 청년을 이미 있는 지원 서비스로 이어 줍니다.";

export type CategorySlug = "job" | "housing" | "mind" | "relation" | "life";

/** 분야. target은 해치가 가리킬 때 쓰는 이름(data-haechi-target), icon은 왼쪽 막대·바로가기 그림 */
export type Category = { slug: CategorySlug; label: string; hint: string; href: string; target: string; tile: string; icon: IconName };

export const CATEGORIES: Category[] = [
  { slug: "job", label: "일자리", hint: "구직, 사회 진입", href: "/category/job", target: "menu-job", tile: "tile-job", icon: "briefcase" },
  { slug: "housing", label: "주거", hint: "월세, 주거비", href: "/category/housing", target: "menu-housing", tile: "tile-housing", icon: "home" },
  { slug: "mind", label: "마음건강", hint: "상담, 회복", href: "/category/mind", target: "menu-mind", tile: "tile-mind", icon: "heart" },
  { slug: "relation", label: "관계·고립", hint: "외로움, 고립·은둔", href: "/category/relation", target: "menu-relation", tile: "tile-relation", icon: "staff" },
  { slug: "life", label: "생활·위기", hint: "생계, 가족돌봄, 위기", href: "/category/life", target: "menu-life", tile: "tile-life", icon: "phone" },
];

export function categoryOf(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

const servicesLinks = (slug: CategorySlug): NavItem[] =>
  SERVICES.filter((s) => s.category === slug).map((s) => ({ label: s.name, href: `/services/${s.id}` }));

export const GUIDE: NavItem = {
  label: "안내",
  href: "/guide",
  desc: SITE_NAME,
  children: [
    { label: "이용 안내", href: "/guide" },
    { label: "해치 소개", href: "/guide#haechi" },
    { label: "지금 힘들 때 연락처", href: "/guide#crisis" },
    { label: "자료 출처", href: "/guide#sources" },
    { label: "공지사항", href: "/notice" },
    { label: "자주 묻는 질문", href: "/faq" },
  ],
};

/** 머리 1차 메뉴. 해치가 가리킬 이름은 MENU_TARGET */
export const MENU: NavItem[] = [
  ...CATEGORIES.map((c) => ({
    label: c.label,
    href: c.href,
    desc: SITE_NAME,
    children: [{ label: `${c.label} 지원 한눈에`, href: c.href }, ...servicesLinks(c.slug)],
  })),
  GUIDE,
];
export const MENU_TARGET: Record<string, string> = Object.fromEntries([
  ...CATEGORIES.map((c) => [c.href, c.target]),
  ["/guide", "menu-guide"],
]);

/** 3차 목록은 쓰지 않는다 */
export function depth3Of(href: string): SideMenuLink[] | undefined {
  void href;
  return undefined;
}

/** PC 왼쪽 고정 막대의 바로가기 */
export const LEFT_BAR: { label: string; href: string; icon: IconName }[] = [
  ...CATEGORIES.map((c) => ({ label: c.label, href: c.href, icon: c.icon })),
  { label: "이용 안내", href: "/guide", icon: "guide" },
  { label: "공지사항", href: "/notice", icon: "bell" },
];

/** 머리의 남색 둥근 띠: 바로 걸 수 있는 창구 셋 */
export const AREA_LINKS = [
  { key: "s01", label: "위기 상담 109", href: "/services/s01" },
  { key: "s08", label: "외로움안녕120", href: "/services/s08" },
  { key: "s20", label: "청년몽땅정보통", href: "/services/s20" },
];

/** 시연에서 열리는 쪽. 이 밖의 안쪽 주소는 DemoGuard가 막는다 */
export const OPEN_PATHS = [/^\/$/, /^\/category\/[a-z]+$/, /^\/services\/s\d\d$/, /^\/guide$/, /^\/search$/];
export const isOpenPath = (path: string) => OPEN_PATHS.some((r) => r.test(path));

/** 주소가 어느 1차 메뉴에 속하는지. 서비스 상세는 그 서비스의 분야에 속한다 */
export function sectionOf(pathname: string) {
  const found = MENU.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
  if (found) return found;
  const m = pathname.match(/^\/services\/(s\d\d)$/);
  const svc = m ? SERVICES.find((s) => s.id === m[1]) : undefined;
  if (svc) return MENU.find((x) => x.href === `/category/${svc.category}`);
  if (pathname === "/search") return GUIDE;
  return undefined;
}

/** 1차 메뉴 하나를 왼쪽 메뉴 모양으로 */
export function sideMenuOf(section: NavItem): SideMenu {
  return { title: section.label, items: (section.children ?? []).map((c) => ({ label: c.label, href: c.href })) };
}
