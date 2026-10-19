import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto w-full max-w-sm space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">계정을 삭제했어요</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        그동안 이용해 주셔서 고마워요. 남긴 리뷰는 작성자 정보 없이 남아 다른
        이용자에게 도움이 돼요.
      </p>
      <Link
        href="/"
        className="flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        지도로 돌아가기
      </Link>
    </main>
  );
}
