import type { Metadata, Viewport } from "next";
// KRDS HTML 컴포넌트 키트 CSS(공공누리 제1유형)를 먼저, 틀 CSS(앞선 공모전 사이트의 궁능 누리집 모양)를 다음에,
// 이 시제품의 덧붙임(site.css, pages.css)을 나중에 읽는다.
import "@/styles/krds/css/component/output.css";
import "./globals.css";
import "@/styles/site.css";
import "@/styles/pages.css";
import SiteHeader, { type AreaCard } from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { DisplaySettingsProvider } from "@/components/layout/DisplaySettings";
import { RouteTop, ToTop } from "@/components/layout/PageTop";
import DemoGuard from "@/components/layout/DemoGuard";
import HaechiLayer from "@/components/haechi/HaechiLayer";
import { CATEGORIES, SITE_DESC, SITE_NAME } from "@/site/ia";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} | 해치동행 시제품`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESC,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// 휴대전화 전체메뉴 맨 위 분야 카드(사진 없음)
const areaCards: AreaCard[] = CATEGORIES.map((c) => ({ key: c.slug, label: c.label, href: c.href }));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-scroll-behavior: KRDS reset 의 html scroll-behavior: smooth 를 Next 가 쪽 옮길 때만 끄게 한다
  return (
    <html lang="ko" data-krds-mode="light" data-scroll-behavior="smooth">
      <body>
        <DisplaySettingsProvider>
          <div id="wrap">
            <div id="krds-skip-link">
              <a href="#contents">본문 바로가기</a>
            </div>
            <div className="hd-strip">
              <p className="hd-strip__brand">
                <b>해치동행</b>
                <span>해치지 않아, 함께 헤쳐 나가자!</span>
              </p>
              <p className="hd-strip__meta">
                <a href="/guide#team">HATCH:ON(해치온)</a> · 2026 청년취업사관학교 해커톤 출품 시제품(시연용 화면)
              </p>
            </div>
            <SiteHeader areaCards={areaCards} />
            <main>{children}</main>
            <SiteFooter />
            <ToTop />
          </div>
          <RouteTop />
          <HaechiLayer />
          <DemoGuard />
        </DisplaySettingsProvider>
      </body>
    </html>
  );
}
