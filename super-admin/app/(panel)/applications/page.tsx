import { Suspense } from "react";

import ApplicationsPageContent from "@/components/modules/Applications/ApplicationsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/applications");

export default function ApplicationsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <ApplicationsPageContent />
    </Suspense>
  );
}
