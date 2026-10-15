"use client";

import { useActionState } from "react";
import { setSaved, type SaveState } from "@/app/saved/actions";

export function SaveToggle({
  restaurantId,
  initialSaved,
  returnTo,
  className,
}: {
  restaurantId: string;
  initialSaved: boolean;
  returnTo: string;
  className: string;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(
    setSaved,
    { saved: initialSaved },
  );
  return (
    <form action={action} className="contents">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="save" value={state.saved ? "0" : "1"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-pressed={state.saved}
        disabled={pending}
        className={className}
      >
        <span aria-hidden>{state.saved ? "★" : "☆"}</span>
        {state.saved ? "저장됨" : "저장"}
      </button>
      {state.message && (
        <p
          role="alert"
          className="basis-full text-sm text-red-700 dark:text-red-400"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
