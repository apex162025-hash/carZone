import { Suspense } from "react";

import FinanceOverviewPageContent from "@/components/modules/Finance/FinanceOverviewPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/finance");

export default function FinancePage() {
  // The period lives in the URL (useSearchParams) — needs a Suspense boundary.
  return (
    <Suspense>
      <FinanceOverviewPageContent />
    </Suspense>
  );
}
