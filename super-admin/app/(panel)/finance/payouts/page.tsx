import { Suspense } from "react";

import PayoutsPageContent from "@/components/modules/Finance/PayoutsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/finance/payouts");

export default function PayoutsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <PayoutsPageContent />
    </Suspense>
  );
}
