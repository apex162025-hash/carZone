import { Suspense } from "react";

import OrdersPageContent from "@/components/modules/Orders/OrdersPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/orders");

export default function OrdersPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <OrdersPageContent />
    </Suspense>
  );
}
