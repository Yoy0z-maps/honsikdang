import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">식당을 찾을 수 없어요</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        주소가 잘못되었거나 아직 공개되지 않은 식당이에요.
      </p>
      <Link href="/" className="text-sm underline underline-offset-2">
        목록으로 돌아가기
      </Link>
    </div>
  );
}
