import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_CONTACT,
  LegalPage,
  Section,
  Table,
} from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "개인정보처리방침 · 혼식당" };

// Kept in sync with what the code actually collects (specs/decisions.md
// §23). Update this page together with any change to stored data.
export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침">
      <p>
        혼식당(이하 &ldquo;서비스&rdquo;)은 이용자의 개인정보를 필요한 만큼만
        수집하고, 아래와 같이 처리합니다.
      </p>

      <Section id="items" title="1. 수집하는 개인정보와 이용 목적">
        <Table
          head={["항목", "언제", "목적"]}
          rows={[
            ["이메일 주소", "로그인할 때", "로그인 링크 발송, 계정 식별"],
            [
              "작성한 리뷰, 장소 제안, 신고 내용",
              "직접 작성할 때",
              "서비스 제공(공개는 운영자 검수 후), 부정 이용 방지",
            ],
            ["저장한 식당", "저장할 때", "내 활동에서 다시 보기"],
            [
              "이용 기록: 리뷰·제안·신고·AI 검색 횟수, AI 검색의 처리 결과·소요 시간·사용량(검색 문장은 저장하지 않음)",
              "해당 기능을 쓸 때",
              "하루 이용 한도 적용, 비용 관리, 오류 확인",
            ],
            [
              "접속 정보: IP 주소, 브라우저 정보, 접속 시각",
              "서비스에 접속할 때",
              "보안, 오류 확인(호스팅·인증 서비스의 서버 기록)",
            ],
            ["로그인 상태 쿠키", "로그인할 때", "로그인 유지"],
          ]}
        />
        <p>
          <strong>위치 정보:</strong> &lsquo;현재 위치&rsquo;를 허용하면 위치는
          지도를 옮기고 주변 식당을 찾는 데만 쓰이며, 서버에 저장하거나 계정과
          연결하지 않습니다. 마지막으로 본 지도 위치는 이용자의
          기기(브라우저)에만 저장됩니다.
        </p>
        <p>
          광고·분석용 쿠키나 외부 분석 도구는 사용하지 않습니다. 만 14세 미만은
          회원으로 가입할 수 없습니다.
        </p>
      </Section>

      <Section id="retention" title="2. 보유 기간과 파기">
        <Table
          head={["항목", "보유 기간"]}
          rows={[
            ["이메일, 저장한 식당, 계정 정보", "계정을 삭제할 때까지"],
            ["AI 검색 이용 기록", "90일 후 자동 삭제"],
            ["리뷰·제안·신고 횟수 기록", "30일 후 자동 삭제"],
            ["접속 정보(서버 기록)", "각 위탁 업체의 기록 보관 기간"],
          ]}
        />
        <p>
          <strong>계정 삭제 시:</strong> 이메일, 프로필, 저장한 식당, 이용
          기록은 바로 삭제됩니다. 작성한 리뷰와 제안한 장소는 다른 이용자를 위해
          남되, 작성자를 알 수 없도록 익명 처리합니다. 계정 삭제는{" "}
          <Link href="/me/account" className="underline underline-offset-2">
            계정 관리
          </Link>
          에서 직접 할 수 있습니다.
        </p>
      </Section>

      <Section id="third" title="3. 제3자 제공">
        <p>개인정보를 제3자에게 제공하지 않습니다.</p>
      </Section>

      <Section id="processors" title="4. 처리 위탁과 국외 이전">
        <p>
          서비스 운영을 위해 아래 업체에 처리를 맡기며, 일부는 해외에서
          처리됩니다. 이용자는 서비스를 이용하지 않거나 계정을 삭제하여 국외
          이전을 거부할 수 있으며, 이 경우 해당 기능을 이용할 수 없습니다.
        </p>
        <Table
          head={["업체", "맡기는 일", "전달되는 정보", "국가"]}
          rows={[
            [
              "Supabase Inc.",
              "데이터베이스, 로그인 처리",
              "1번의 모든 항목",
              "데이터는 대한민국(서울) 리전에 저장, 운영사는 미국",
            ],
            ["Vercel Inc.", "웹 호스팅", "접속 정보", "미국 등"],
            [
              "Google LLC (Gmail)",
              "로그인 링크 메일 발송",
              "이메일 주소",
              "미국 등",
            ],
            [
              "NAVER Cloud",
              "지도 표시",
              "접속 정보, 보고 있는 지도 위치",
              "대한민국",
            ],
            [
              "Voyage AI (MongoDB, Inc.)",
              "AI 검색의 관련도 계산",
              "공개된 리뷰 문장, 로그인 이용자가 입력한 선호 표현",
              "미국",
            ],
            [
              "OpenAI, L.L.C.",
              "AI 검색 문장 해석(현재 사용하지 않음, 켤 때 이 방침을 갱신)",
              "AI 검색 문장(업체 측 보관 요청하지 않음)",
              "미국",
            ],
          ]}
        />
      </Section>

      <Section id="rights" title="5. 이용자의 권리">
        <p>
          이용자는 언제든지 자신의 정보를 열람·수정·삭제하거나 처리 정지를
          요청할 수 있습니다. 리뷰와 저장한 식당은{" "}
          <Link href="/me/reviews" className="underline underline-offset-2">
            내 활동
          </Link>
          에서, 계정은{" "}
          <Link href="/me/account" className="underline underline-offset-2">
            계정 관리
          </Link>
          에서 직접 처리할 수 있고, 그 밖의 요청은 아래 연락처로 보내 주시면
          지체 없이 처리합니다.
        </p>
      </Section>

      <Section id="security" title="6. 안전성 확보 조치">
        <ul className="list-disc space-y-1 pl-5">
          <li>모든 통신은 암호화(HTTPS)합니다.</li>
          <li>
            데이터베이스는 행 단위 접근 제어로 본인 정보만 읽고 쓸 수 있게 하고,
            관리 권한은 운영자에게만 부여합니다.
          </li>
          <li>비밀 키는 서버에만 두고 브라우저에 노출하지 않습니다.</li>
          <li>
            필요 없는 정보는 수집하지 않고, 보유 기간이 지나면 삭제합니다.
          </li>
        </ul>
      </Section>

      <Section id="contact" title="7. 개인정보 보호책임자">
        <p>
          {LEGAL_CONTACT.name} · 이메일{" "}
          <a
            href={`mailto:${LEGAL_CONTACT.email}`}
            className="underline underline-offset-2"
          >
            {LEGAL_CONTACT.email}
          </a>
        </p>
        <p>
          개인정보 침해 신고·상담은 개인정보분쟁조정위원회(1833-6972),
          개인정보침해신고센터(국번 없이 118), 대검찰청(국번 없이 1301),
          경찰청(국번 없이 182)에도 문의할 수 있습니다.
        </p>
      </Section>

      <Section id="changes" title="8. 방침의 변경">
        <p>
          이 방침이 바뀌면 시행 7일 전부터 서비스 안에 알립니다. 수집 항목이나
          이용 목적이 바뀌는 경우에는 30일 전에 알립니다.
        </p>
      </Section>
    </LegalPage>
  );
}
