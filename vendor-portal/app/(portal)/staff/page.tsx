import { Suspense } from "react";

import StaffPageContent from "@/components/modules/Staff/StaffPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/staff");

export default function StaffPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <StaffPageContent />
    </Suspense>
  );
}
