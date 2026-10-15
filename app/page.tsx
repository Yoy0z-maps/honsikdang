export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">혼식당</h1>
      <p className="text-lg leading-relaxed">
        혼자 먹기 편한 식당을 상황, 음식, 예산으로 찾는 지도
      </p>
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        서비스를 준비하고 있습니다.
      </p>
    </main>
  );
}
