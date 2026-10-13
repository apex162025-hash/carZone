import { Suspense } from "react";

import CustomersPageContent from "@/components/modules/Customers/CustomersPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/customers");

export default function CustomersPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <CustomersPageContent />
    </Suspense>
  );
}
