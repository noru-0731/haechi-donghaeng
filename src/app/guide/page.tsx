// 이용 안내: 누리집과 해치 소개, 해치가 하지 않는 일, 위기 연락처, 자료 출처.
import type { Metadata } from "next";
import { GUIDE } from "@/site/ia";
import { SubPage } from "@/components/layout/PageParts";
import { SOURCES } from "@/data/sources";
import { OutLink } from "@/components/site/bits";

export const metadata: Metadata = { title: "이용 안내" };

export default function GuidePage() {
  return (
    <SubPage crumbs={[{ label: "안내", href: "/guide" }]} title="이용 안내" side={GUIDE} current="/guide">
      <div className="hd-prose">
      <p className="hd-lead">
        이 누리집은 2026 청년취업사관학교 해커톤에 낸 시제품의 시연용 화면입니다. 서울 청년이 이용할 수 있는 기존 지원 서비스를 모아
        보여 줍니다.
      </p>

      <h2 className="hd-section-title" id="haechi">
        해치와 대화하는 방법
      </h2>
      <p>
        화면 가장자리의 해치는 서울시 캐릭터입니다. 찾는 것을 말하거나 선택지를 누르면 메뉴 위치를 짚어 주고, 대화에서 필요한 도움이
        보이면 맞는 기존 서비스의 조건과 신청 방법을 보여 줍니다. 답하기 어려운 질문은 넘어가도 되고, 해치는 언제든 숨길 수 있습니다.
      </p>
      <ul className="hd-bullets">
        <li>해치는 생성형 AI로 대화합니다. 대화를 어떻게 다루는지는 아래 &lsquo;개인정보와 AI 이용&rsquo;에 적었습니다.</li>
        <li>추천 카드의 기관 이름, 조건, 연락처, 주소는 이 누리집의 서비스 자료에서만 가져옵니다.</li>
        <li>대화가 끝나면 알게 된 내용을 요약 카드로 보여 줍니다. 직접 고치고 복사해 상담이나 신청할 때 참고할 수 있습니다.</li>
      </ul>

      <h2 className="hd-section-title" id="privacy">
        개인정보와 AI 이용
      </h2>
      <ul className="hd-bullets">
        <li>이 누리집은 대화를 서버나 데이터베이스에 저장하지 않습니다. 대화는 보고 있는 브라우저 창에만 있고, 창을 닫거나 새로 고치거나 &lsquo;처음부터 다시&rsquo;를 누르면 사라집니다.</li>
        <li>해치가 답할 때마다 지금까지의 대화와 보고 있는 쪽의 이름이 생성형 AI 회사 Anthropic(Claude)으로 전송됩니다. 이름, 전화번호, 주소처럼 나를 알아볼 수 있는 정보는 적지 않는 것이 좋습니다.</li>
        <li>Anthropic은 받은 대화를 기본으로 30일 안에 지우고, 이용 정책 위반으로 표시된 대화는 최대 2년까지 둘 수 있다고 안내합니다. 기본으로 AI 학습에는 쓰지 않는다고 안내합니다(Anthropic 개인정보 안내, 2026년 7·8월 갱신).</li>
        <li>이미 전송된 내용은 이 누리집에서 지울 수 없습니다.</li>
        <li>대화는 메뉴를 안내하고 맞는 지원 서비스를 찾는 데만 씁니다. 요약은 담당자에게 자동으로 보내지 않고, 이용자가 직접 복사할 때만 밖으로 나갑니다.</li>
      </ul>

      <h2 className="hd-section-title" id="decide">
        지원 대상 여부는 각 기관이 정합니다
      </h2>
      <p>
        해치는 진단하지 않고, 지원 대상인지 정하지 않습니다. 조건이 맞아 보이는 곳을 안내할 뿐이고 참여자 선정은 각 기관이 합니다.
        모집 기간이 끝난 사업은 추천하지 않고 상세 쪽에 이번 모집이 끝났다고 표시합니다.
      </p>

      <h2 className="hd-section-title" id="crisis">
        지금 힘들고 위험하다고 느낄 때
      </h2>
      <div className="hd-info hd-info--danger">
        <p>
          자살예방상담전화 <b>109</b>, 정신건강위기상담전화 <b>1577-0199</b>는 24시간 받습니다. 당장 생명이 위험하면 <b>119</b>나{" "}
          <b>112</b>에 전화하세요. 전화가 어렵다면 서울시 자살예방센터 누리집의 챗봇 마음이로 글로 시작해 상담사와 이어질 수 있습니다.
        </p>
      </div>

      <h2 className="hd-section-title" id="team">
        해치동행과 HATCH:ON
      </h2>
      <p>
        해치동행은 &lsquo;해치지 않아, 함께 헤쳐 나가자!&rsquo;를 내건 서비스로, HATCH:ON(해치온) 팀이 기획했습니다. HATCH:ON은 서울시
        캐릭터 해치와 영어 Hatch(문, 출입구), ON(연결, 켜짐)을 합친 이름입니다. 청년이 세상과 다시 이어지는 문을 연다는 뜻을 담았습니다.
      </p>

      <h2 className="hd-section-title" id="sources">
        자료 출처
      </h2>
      <p>서비스 정보는 2026년 10월 18일 기준으로 아래 공식 안내와 보도에서 정리했습니다.</p>
      <ol className="hd-sources">
        {SOURCES.map((x) => (
          <li key={x.id}>
            {x.org}, <OutLink href={x.url}>{x.title}</OutLink>
            {x.date && `, ${x.date}`}
          </li>
        ))}
      </ol>
      <p>
        캐릭터: 서울특별시 해치&amp;소울프렌즈(
        <OutLink href="https://www.seoul.go.kr/seoul/symbol_ca.do">www.seoul.go.kr/seoul/symbol_ca.do</OutLink>).
      </p>
      <p>
        본 저작물은 행정안전부에서 2024년 작성하여 공공누리 제1유형으로 개방한 ‘범정부 UI/UX 디자인시스템(KRDS)’을 이용하였으며, 해당
        저작물은 ‘<OutLink href="https://www.krds.go.kr">KRDS 디자인시스템 홈페이지(www.krds.go.kr)</OutLink>’에서 무료로 다운받으실 수
        있습니다.
      </p>
      </div>
    </SubPage>
  );
}
