import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccountForm } from "@/features/account/DeleteAccountForm";
import { ActivityNav } from "@/features/me/ActivityNav";
import { loginPath } from "@/lib/auth/redirect";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

async function AccountContent() {
  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) redirect(loginPath("/me/account"));
  return (
    <section aria-labelledby="delete-heading" className="space-y-3">
      <h2 id="delete-heading" className="text-lg font-semibold">
        계정 삭제
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>이메일 주소, 프로필, 저장한 식당, 이용 기록은 바로 삭제돼요.</li>
        <li>
          작성한 리뷰와 제안한 장소는 다른 이용자를 위해 남지만, 작성자 정보
          없이 익명으로 바뀌어요. 이후에는 수정하거나 지울 수 없어요.
        </li>
        <li>삭제한 계정은 되돌릴 수 없어요.</li>
      </ul>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        자세한 내용은{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        을 확인해 주세요. 리뷰를 먼저 지우고 싶다면{" "}
        <Link href="/me/reviews" className="underline underline-offset-2">
          내 리뷰
        </Link>
        에서 삭제할 수 있어요.
      </p>
      <DeleteAccountForm />
    </section>
  );
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <ActivityNav current={null} />
      <h1 className="text-2xl font-bold tracking-tight">계정 관리</h1>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <AccountContent />
      </Suspense>
    </main>
  );
}
