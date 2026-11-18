// next/link를 감싼 링크. 시연에서 막아 둔 쪽(site/ia.ts OPEN_PATHS 밖)은 미리 불러오지 않는다.
// 막아 둔 쪽은 만들지 않아 미리 불러오면 404가 콘솔에 찍혔다(사이트맵, 공지사항, 자주 묻는 질문 등).
import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { isOpenPath } from "@/site/ia";

type Props = ComponentProps<typeof NextLink>;

const SiteLink = forwardRef<HTMLAnchorElement, Props>(function SiteLink({ prefetch, href, ...rest }, ref) {
  const path = typeof href === "string" ? href.split(/[?#]/)[0] : (href.pathname ?? "");
  const open = !path.startsWith("/") || isOpenPath(path);
  return <NextLink ref={ref} href={href} prefetch={open ? prefetch : false} {...rest} />;
});

export default SiteLink;
