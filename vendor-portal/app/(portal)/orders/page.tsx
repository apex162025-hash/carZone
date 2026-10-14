import { Suspense } from "react";

import OrdersListPageContent from "@/components/modules/Orders/OrdersListPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/orders");

export default function OrdersPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <OrdersListPageContent view="orders" />
    </Suspense>
  );
}
