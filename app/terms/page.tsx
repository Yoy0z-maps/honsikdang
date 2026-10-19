import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalPage, Section } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "이용약관 · 혼식당" };

export default function TermsPage() {
  return (
    <LegalPage title="이용약관">
      <Section id="purpose" title="1. 목적">
        <p>
          이 약관은 혼식당(이하 &ldquo;서비스&rdquo;)을 이용하는 조건과 운영자와
          이용자의 권리·의무를 정합니다.
        </p>
      </Section>

      <Section id="service" title="2. 서비스 내용">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            혼자 먹기 편한 식당을 지도·검색·추천으로 찾고, 방문 리뷰와 장소
            제안을 남길 수 있는 무료 베타 서비스입니다.
          </li>
          <li>
            식당 정보와 리뷰는 이용자가 남긴 경험을 바탕으로 하며, 방문 시점과
            지금이 다를 수 있습니다. 영업시간·가격·좌석 등의 정확성은 보장하지
            않으니 방문 전에 직접 확인해 주세요.
          </li>
          <li>
            추천과 AI 검색은 저장된 정보를 바탕으로 계산한 결과이며, 개인에게
            맞는다는 보장은 없습니다.
          </li>
        </ul>
      </Section>

      <Section id="account" title="3. 계정">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            이메일로 받은 링크로 로그인하며, 만 14세 이상만 가입할 수 있습니다.
          </li>
          <li>계정은 본인만 사용해야 하며, 다른 사람을 사칭할 수 없습니다.</li>
          <li>
            이용자는 언제든{" "}
            <Link href="/me/account" className="underline underline-offset-2">
              계정 관리
            </Link>
            에서 계정을 삭제할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section id="content" title="4. 이용자가 올린 콘텐츠">
        <ul className="list-disc space-y-1 pl-5">
          <li>리뷰·장소 제안·신고의 내용은 작성한 이용자가 책임집니다.</li>
          <li>
            이용자는 자신이 올린 콘텐츠를 서비스 안에서 표시·검색·추천 근거로
            인용하는 데 쓸 수 있도록 운영자에게 무상의 비독점적 사용을
            허락합니다.
          </li>
          <li>
            계정을 삭제해도 리뷰와 제안한 장소는 작성자 정보 없이 남습니다.
            남기고 싶지 않은 리뷰는 삭제하기 전에 직접 지워 주세요.
          </li>
          <li>모든 리뷰와 장소는 운영자의 검수를 거쳐 공개됩니다.</li>
        </ul>
      </Section>

      <Section id="prohibited" title="5. 금지 행위">
        <ul className="list-disc space-y-1 pl-5">
          <li>가보지 않은 곳의 리뷰, 대가를 받은 리뷰, 광고·홍보</li>
          <li>다른 사람의 개인정보나 사진을 동의 없이 올리는 행위</li>
          <li>욕설·차별·명예훼손 등 다른 사람에게 피해를 주는 내용</li>
          <li>
            자동화된 방법으로 정보를 대량 수집하거나 서비스를 방해하는 행위
          </li>
        </ul>
        <p>
          운영자는 이를 위반한 콘텐츠를 공개하지 않거나 내릴 수 있고, 사유는
          작성자에게 보여 줍니다. 반복되는 경우 이용을 제한할 수 있습니다.
        </p>
      </Section>

      <Section id="changes" title="6. 서비스의 변경과 중단">
        <p>
          베타 서비스로서 기능이 바뀌거나 중단될 수 있으며, 중요한 변경은 미리
          서비스 안에 알립니다.
        </p>
      </Section>

      <Section id="liability" title="7. 책임의 제한">
        <p>
          운영자는 무료로 제공하는 서비스의 정보 오류나 이용자 간 분쟁에 대해
          고의 또는 중대한 과실이 없는 한 책임지지 않습니다.
        </p>
      </Section>

      <Section id="terms-changes" title="8. 약관의 변경">
        <p>
          약관을 바꿀 때는 시행 7일 전부터(이용자에게 불리한 변경은 30일 전부터)
          서비스 안에 알립니다.
        </p>
      </Section>

      <Section id="contact" title="9. 문의">
        <p>
          {LEGAL_CONTACT.name} ·{" "}
          <a
            href={`mailto:${LEGAL_CONTACT.email}`}
            className="underline underline-offset-2"
          >
            {LEGAL_CONTACT.email}
          </a>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
        </p>
      </Section>
    </LegalPage>
  );
}
