import { Suspense } from "react";

import SchedulePageContent from "@/components/modules/Schedule/SchedulePageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/schedule");

export default function SchedulePage() {
  // useSearchParams (day + branch live in the URL) needs a Suspense boundary.
  return (
    <Suspense>
      <SchedulePageContent />
    </Suspense>
  );
}
