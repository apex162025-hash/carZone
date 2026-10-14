import { Suspense } from "react";

import FinancePageContent from "@/components/modules/Finance/FinancePageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/finance");

export default function FinancePage() {
  // The period filter lives in the URL (useSearchParams needs a Suspense boundary).
  return (
    <Suspense>
      <FinancePageContent />
    </Suspense>
  );
}
