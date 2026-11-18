// 출처 목록. 번호 1~17은 「기존 서비스 연결 정리 2026-10-18.md」의 출처 번호와 같다.
// 18·19번은 원본 13·15번에 함께 적힌 두 번째 주소를 따로 뗀 것이다(18번은 서울형 자기돌봄비 2차 공고라 청년미래센터 자기돌봄비와 나눴다).
// 모든 주소는 2026-10-19에 열어 응답 200을 확인했다.

export type Source = { id: number; org: string; title: string; url: string; date?: string };

export const SOURCES: Source[] = [
  { id: 1, org: "서울특별시 보도자료", title: "고립은둔 청년 온(ON) 프로젝트", url: "https://www.seoul.go.kr/news/news_report.do?nttNo=455766", date: "2026년 4월 7일" },
  { id: 2, org: "서울특별시 청년몽땅정보통", title: "2025 서울시 고립 은둔청년 지원사업", url: "https://youth.seoul.go.kr/infoData/plcyInfo/view.do?key=2309150002&plcyBizId=V202500009" },
  { id: 3, org: "서울특별시 복지분야 누리집", title: "정신건강위기상담전화 1577-0199와 AI 상담 챗봇 마음이", url: "https://news.seoul.go.kr/welfare/archives/576572", date: "2026년 2월" },
  { id: 4, org: "서울특별시 내 손안에 서울", title: "부담 없이, 로그인 없이 시작하는 첫 고민 상담, AI 챗봇 '마음이'", url: "https://mediahub.seoul.go.kr/archives/2017112" },
  { id: 5, org: "서울특별시 내 손안에 서울", title: "고립예방플랫폼 '똑똑' 확대·개편", url: "https://mediahub.seoul.go.kr/archives/2015142", date: "2025년 7월 22일" },
  { id: 6, org: "서울특별시 복지분야 누리집", title: "외로움안녕120 안내", url: "https://news.seoul.go.kr/welfare/archives/569295" },
  { id: 7, org: "서울특별시 내 손안에 서울", title: "서울마음편의점", url: "https://mediahub.seoul.go.kr/archives/2017960" },
  { id: 8, org: "서울특별시 행정분야 누리집", title: "2026 청년 마음건강 지원사업 4차 추가모집", url: "https://news.seoul.go.kr/gov/archives/580787" },
  { id: 9, org: "경향신문", title: "109 상담 인력 확대 보도", url: "https://www.khan.co.kr/article/202605311200001/", date: "2026년 5월" },
  { id: 10, org: "서울특별시 내 손안에 서울", title: "전국민 마음투자 심리상담 지원", url: "https://mediahub.seoul.go.kr/archives/2013361" },
  { id: 11, org: "헤럴드경제", title: "양천구 구직단념 청년 지원", url: "https://www.heraldk.com/article/2026022416411924343", date: "2026년 2월 24일" },
  { id: 12, org: "서울특별시 내 손안에 서울", title: "서울 청년수당 6,000명 추가 모집", url: "https://mediahub.seoul.go.kr/archives/2018273" },
  { id: 13, org: "서울특별시 내 손안에 서울", title: "만 13~34세 청년에 자기돌봄비 200만 원", url: "https://mediahub.seoul.go.kr/archives/2019538" },
  { id: 14, org: "서울특별시 내 손안에 서울", title: "서울잇다플레이스", url: "https://mediahub.seoul.go.kr/archives/2019485", date: "2026년 9월 23일" },
  { id: 15, org: "복지로", title: "긴급복지지원", url: "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1306220_1118.html" },
  { id: 16, org: "헤럴드경제", title: "노원구 청년 심리상담센터", url: "https://www.heraldk.com/article/2026020913242018161", date: "2026년 2월 9일" },
  { id: 17, org: "서울특별시 내 손안에 서울", title: "서울청년기지개센터 안내", url: "https://mediahub.seoul.go.kr/archives/2012928" },
  { id: 18, org: "서울특별시 복지분야 누리집", title: "가족돌봄청소년·청년 자기돌봄비 사업참여자 모집(2차)", url: "https://news.seoul.go.kr/welfare/archives/580804", date: "2026년 5월" },
  { id: 19, org: "서울특별시 복지분야 누리집", title: "서울형 긴급복지 지원제도", url: "https://news.seoul.go.kr/welfare/archives/48196" },
  // 20번은 2026-10-19 팀 피드백(기사 출처를 공식 출처로)으로 더했다. 노원구 청년심리상담센터(16번)는 구청 공식 쪽을 찾지 못해 기사를 그대로 둔다
  { id: 20, org: "복지로", title: "청년도전지원사업 안내", url: "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1304568_1118.html" },
];

export function sourceOf(id: number) {
  return SOURCES.find((s) => s.id === id);
}
