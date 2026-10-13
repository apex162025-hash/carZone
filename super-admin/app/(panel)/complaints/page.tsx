import { Suspense } from "react";

import ComplaintsPageContent from "@/components/modules/Complaints/ComplaintsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/complaints");

export default function ComplaintsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <ComplaintsPageContent />
    </Suspense>
  );
}
