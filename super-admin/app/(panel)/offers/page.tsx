import { Suspense } from "react";

import OffersPageContent from "@/components/modules/Offers/OffersPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/offers");

export default function OffersPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <OffersPageContent />
    </Suspense>
  );
}
