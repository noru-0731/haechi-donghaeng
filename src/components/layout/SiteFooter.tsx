// 공통 푸터(앞선 공모전 사이트의 궁능 누리집 모양 그대로): 위 줄 링크 + 관련사이트 펼침, 아래 회색 판에 사이트 이름·"기관별 연락처" 펼침·출처.
// 정부 누리집이 아니므로 인증 마크·운영기관 식별자는 넣지 않는다. 시연용 예시 누리집이라는 말을 한 줄 둔다.
// 기관별 연락처: 서비스 자료(data/services.ts)에서 전화 창구가 있는 곳만.
import { Fragment } from "react";
import Link from "@/components/site/SiteLink";
import { SITE_NAME } from "@/site/ia";
import { SERVICES } from "@/data/services";
import FooterRelated from "./FooterRelated";
import FooterTel from "./FooterTel";
import { NewWinIcon } from "./NewWin";
import f from "./Footer.module.css";

/** 전화번호는 붙임표 뒤에서만 줄이 바뀌게 한다(궁능 휴대전화 표처럼 "054-772-" / "9289"). 묶음 안에서는 끊지 않는다.
 *  좁은 칸(휴대전화, 글자 크게)에서 번호가 칸과 화면 밖으로 나가지 않게. */
function TelText({ tel }: { tel: string }) {
  const parts = tel.split("-");
  return (
    <>
      {parts.map((g, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          <span className={f.telPart}>{i < parts.length - 1 ? `${g}-` : g}</span>
        </Fragment>
      ))}
    </>
  );
}

function TelTable() {
  const rows = SERVICES.filter((x) => x.contacts.length > 0);
  return (
    <table className={f.table}>
      <caption className="sr-only">기관별 연락처 표 - 서비스, 운영 시간, 연락처로 구성</caption>
      <colgroup>
        <col className={f.c1} />
        <col className={f.c2} />
        <col className={f.c3} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">서비스</th>
          <th scope="col">운영 시간</th>
          <th scope="col">연락처</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x) => (
          <tr key={x.id}>
            <th scope="row">{x.name}</th>
            <td>{x.hours}</td>
            <td>
              {x.contacts.map((c, i) => (
                <Fragment key={c.tel}>
                  {i > 0 && <br />}
                  <a href={`tel:${c.tel.replace(/-/g, "")}`}>
                    <TelText tel={c.tel} />
                  </a>
                  {c.how && <> ({c.how})</>}
                </Fragment>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SiteFooter() {
  return (
    <footer className="rc-footer">
      <div className="rc-ft-top">
        <div className="rc-ft-inner">
          <ul className="rc-ft-links">
            <li>
              <Link href="/privacy">개인정보처리방침</Link>
            </li>
            <li>
              <Link href="/guide">이용 안내</Link>
            </li>
            <li>
              <Link href="/guide#sources">자료 출처와 저작권</Link>
            </li>
            <li>
              <Link href="/sitemap">사이트맵</Link>
            </li>
          </ul>
          <FooterRelated />
        </div>
      </div>
      <div className="rc-ft-btm">
        <div className="rc-ft-inner">
          <p className="rc-ft-logo">{SITE_NAME}</p>
          <div className="rc-ft-txt">
            <FooterTel label="기관별 연락처">
              <TelTable />
            </FooterTel>
            <ul className="rc-ft-credit">
              <li>
                화면 틀: 행정안전부 ‘범정부 UI/UX 디자인시스템(
                <a href="https://www.krds.go.kr" target="_blank" rel="noopener noreferrer" title="새 창 열림">
                  KRDS
                  <NewWinIcon />
                </a>
                )’, 공공누리 제1유형
              </li>
              <li>
                캐릭터: 서울특별시{" "}
                <a href="https://www.seoul.go.kr/seoul/symbol_ca.do" target="_blank" rel="noopener noreferrer" title="새 창 열림">
                  해치&amp;소울프렌즈
                  <NewWinIcon />
                </a>
              </li>
              <li>서비스 정보: 서울특별시·보건복지부·고용노동부 공식 안내와 보도(2026년 10월 18일 확인)</li>
              <li>
                해치동행(해치지 않아, 함께 헤쳐 나가자!)은 HATCH:ON(해치온) 팀이 기획했습니다. HATCH:ON은 서울시 캐릭터 해치와 영어 Hatch(문,
                출입구), ON(연결, 켜짐)을 합친 이름으로, 청년이 세상과 다시 이어지는 문을 연다는 뜻입니다.
              </li>
              <li>이 누리집은 2026 청년취업사관학교 해커톤 시연을 위한 예시 화면입니다. 실제 신청과 상담은 각 기관에서 합니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
