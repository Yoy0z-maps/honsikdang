import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/redirect";

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );
  const linkFailed = params.error === "link";

  return (
    <>
      {linkFailed && (
        <p role="alert" className="text-sm text-red-700">
          로그인 링크가 만료되었거나 이미 사용되었어요. 새 링크를 받아 주세요.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm space-y-4 px-4 py-10">
      <Link href="/" className="text-sm underline underline-offset-2">
        ← 혼식당
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        이메일로 받은 링크를 누르면 로그인돼요. 처음이면 계정이 자동으로
        만들어져요. 리뷰를 쓰려면 로그인이 필요해요.
      </p>
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        로그인하면{" "}
        <Link href="/terms" className="underline underline-offset-2">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        에 동의하는 것으로 봐요.
      </p>
    </main>
  );
}
