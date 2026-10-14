import { Suspense } from "react";

import ShiftsPageContent from "@/components/modules/Shifts/ShiftsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/shifts");

export default function ShiftsPage() {
  // useSearchParams (URL tab/filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <ShiftsPageContent />
    </Suspense>
  );
}
