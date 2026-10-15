"use client";

import { deleteReview } from "@/app/reviews/actions";

export function DeleteReviewButton({
  reviewId,
  restaurantName,
}: {
  reviewId: string;
  restaurantName: string;
}) {
  return (
    <form
      action={deleteReview}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `${restaurantName} 리뷰를 삭제할까요? 되돌릴 수 없어요.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <button
        type="submit"
        aria-label={`${restaurantName} 리뷰 삭제`}
        className="text-sm text-red-700 underline underline-offset-2"
      >
        삭제
      </button>
    </form>
  );
}
