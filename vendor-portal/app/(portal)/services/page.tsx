import { Suspense } from "react";

import ServicesPageContent from "@/components/modules/Services/ServicesPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/services");

export default function ServicesPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <ServicesPageContent />
    </Suspense>
  );
}
