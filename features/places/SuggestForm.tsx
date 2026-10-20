"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { suggestPlace, type SuggestState } from "@/app/places/actions";
import type { Camera } from "@/lib/domain/camera";
import { formatDistance } from "@/lib/domain/format";
import {
  MATCH_REASON_LABELS,
  MAX_PLACE_ADDRESS,
  MAX_PLACE_NAME,
  describeMatch,
  type PlaceMatch,
} from "@/lib/domain/place";
import type { PlaceCandidate } from "@/lib/domain/place-search";
import { PinPicker } from "./PinPicker";
import { PlaceSearch } from "./PlaceSearch";

type Props = {
  initial: Camera;
  /** Whether restaurant name search is configured (C-83). */
  searchEnabled?: boolean;
  categories: { slug: string; label: string }[];
};

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700";

function MatchList({ matches }: { matches: PlaceMatch[] }) {
  // Other users' pending proposals are hidden (Q27): show one count line.
  const visible = matches.filter((m) => m.restaurant_id !== null);
  const hiddenCount = matches.length - visible.length;
  return (
    <ul className="mt-2 space-y-2">
      {hiddenCount > 0 && (
        <li className="rounded-lg bg-white/70 p-2 dark:bg-zinc-900/70">
          <p className="font-medium">
            이미 검수 중인 다른 제안이 {hiddenCount}건 있어요
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            내용은 검수가 끝나면 공개돼요.
          </p>
        </li>
      )}
      {visible.map((m) => (
        <li
          key={m.restaurant_id}
          className="rounded-lg bg-white/70 p-2 dark:bg-zinc-900/70"
        >
          <p className="font-medium">{describeMatch(m)}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {MATCH_REASON_LABELS[m.reason]} · {formatDistance(m.distance_m)}
          </p>
          {m.status === "approved" && m.restaurant_id && (
            <Link
              href={`/restaurants/${m.restaurant_id}/review`}
              className="mt-1 inline-flex min-h-11 items-center underline underline-offset-2"
            >
              이 식당에 리뷰 쓰기
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SuggestForm({
  initial,
  categories,
  searchEnabled = false,
}: Props) {
  const [state, action, pending] = useActionState<SuggestState, FormData>(
    suggestPlace,
    { version: 0 },
  );
  const [position, setPosition] = useState(initial.center);
  // A picked search result, tied to the state version it was picked in, so a
  // later submit's echoed values win and a newer pick wins over those.
  const [prefill, setPrefill] = useState<{
    candidate: PlaceCandidate;
    version: number;
    nonce: number;
  } | null>(null);
  const outcome = state.outcome;

  if (outcome?.kind === "created") {
    return (
      <div role="status" className="space-y-3">
        <h2 className="text-xl font-bold">장소를 제안했어요</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          운영자 검수 후 지도에 공개돼요. 그동안 혼밥 경험을 먼저 남길 수
          있어요.
        </p>
        <Link
          href={`/restaurants/${outcome.restaurantId}/review`}
          className="flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          이 식당 리뷰도 남기기
        </Link>
        <Link
          href="/me/places"
          className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 dark:border-zinc-700"
        >
          내 제안 보기
        </Link>
      </div>
    );
  }

  const picked =
    prefill && prefill.version === state.version ? prefill.candidate : null;
  const values = picked
    ? {
        name: picked.name,
        address: picked.address,
        categorySlug:
          picked.categorySlug &&
          categories.some((c) => c.slug === picked.categorySlug)
            ? picked.categorySlug
            : (state.values?.categorySlug ?? ""),
      }
    : state.values;
  const fieldsKey = prefill?.nonce ?? 0;
  const moveTo =
    picked?.position && prefill
      ? { position: picked.position, nonce: prefill.nonce }
      : null;

  function pick(candidate: PlaceCandidate) {
    setPrefill((p) => ({
      candidate,
      version: state.version,
      nonce: (p?.nonce ?? 0) + 1,
    }));
    if (candidate.position) setPosition(candidate.position);
  }
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {searchEnabled && <PlaceSearch onPick={pick} />}
      <form key={state.version} action={action} className="space-y-4">
        <PinPicker initial={initial} moveTo={moveTo} onChange={setPosition} />
        <input type="hidden" name="lat" value={position.lat} />
        <input type="hidden" name="lng" value={position.lng} />

        {state.message && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 p-3 text-sm text-red-800"
          >
            {state.message}
          </p>
        )}
        {errors.lat && (
          <p role="alert" className="text-sm text-red-700">
            {errors.lat}
          </p>
        )}

        {outcome?.kind === "blocked" && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/40"
          >
            <p className="font-semibold">이미 등록된 식당이에요.</p>
            <p>
              같은 이름의 식당이 50m 안에 있어요. 다른 식당이라면 이름이나
              위치를 확인해 주세요.
            </p>
            <MatchList matches={outcome.matches} />
          </div>
        )}
        {outcome?.kind === "needs_confirmation" && (
          <div
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/40"
          >
            <p className="font-semibold">근처에 비슷한 식당이 있어요.</p>
            <p>아래 식당과 다른 곳이 맞는지 확인해 주세요.</p>
            <MatchList matches={outcome.matches} />
            <label className="mt-2 flex min-h-11 items-center gap-2 font-medium">
              <input
                type="checkbox"
                name="confirmNotDuplicate"
                required
                className="h-5 w-5"
              />
              위 식당과 다른 곳이 맞아요
            </label>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="place-name" className="block font-medium">
            식당 이름 <span className="text-red-700">*</span>
          </label>
          <input
            key={`place-name-${fieldsKey}`}
            id="place-name"
            name="name"
            required
            maxLength={MAX_PLACE_NAME}
            defaultValue={values?.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "place-name-error" : undefined}
            className={inputClass}
          />
          {errors.name && (
            <p id="place-name-error" className="text-sm text-red-700">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="place-address" className="block font-medium">
            주소 <span className="text-red-700">*</span>
          </label>
          <input
            key={`place-address-${fieldsKey}`}
            id="place-address"
            name="address"
            required
            maxLength={MAX_PLACE_ADDRESS}
            placeholder="예: 서울 중구 세종대로 110"
            defaultValue={values?.address}
            aria-invalid={!!errors.address}
            aria-describedby={
              errors.address ? "place-address-error" : undefined
            }
            className={inputClass}
          />
          {errors.address && (
            <p id="place-address-error" className="text-sm text-red-700">
              {errors.address}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="place-category" className="block font-medium">
            음식 종류 <span className="text-red-700">*</span>
          </label>
          <select
            key={`place-category-${fieldsKey}`}
            id="place-category"
            name="categorySlug"
            required
            defaultValue={values?.categorySlug ?? ""}
            aria-invalid={!!errors.categorySlug}
            className={inputClass}
          >
            <option value="" disabled>
              골라 주세요
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.categorySlug && (
            <p className="text-sm text-red-700">{errors.categorySlug}</p>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          제안한 장소는 운영자 검수 후 공개돼요. 하루에 5곳까지 제안할 수
          있어요.
        </p>

        <button
          type="submit"
          // Stays enabled after a block: the user may fix the name or move the
          // pin and try again.
          disabled={pending}
          className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "확인 중…" : "장소 제안하기"}
        </button>
      </form>
    </div>
  );
}
