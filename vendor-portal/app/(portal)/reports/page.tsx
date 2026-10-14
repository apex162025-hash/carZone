import { Suspense } from "react";

import ReportsPageContent from "@/components/modules/Reports/ReportsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/reports");

export default function ReportsPage() {
  // Report type and date range live in the URL (useSearchParams needs a Suspense boundary).
  return (
    <Suspense>
      <ReportsPageContent />
    </Suspense>
  );
}
