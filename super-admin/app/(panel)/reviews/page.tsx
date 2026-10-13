import { Suspense } from "react";

import ReviewsPageContent from "@/components/modules/Reviews/ReviewsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/reviews");

export default function ReviewsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <ReviewsPageContent />
    </Suspense>
  );
}
