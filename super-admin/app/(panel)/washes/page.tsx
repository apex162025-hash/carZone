import { Suspense } from "react";

import WashesPageContent from "@/components/modules/Washes/WashesPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/washes");

export default function WashesPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <WashesPageContent />
    </Suspense>
  );
}
