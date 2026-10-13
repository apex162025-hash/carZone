import { Suspense } from "react";

import AuditPageContent from "@/components/modules/Audit/AuditPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/audit");

export default function AuditPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <AuditPageContent />
    </Suspense>
  );
}
