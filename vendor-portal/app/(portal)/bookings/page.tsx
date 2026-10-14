import { Suspense } from "react";

import OrdersListPageContent from "@/components/modules/Orders/OrdersListPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/bookings");

export default function BookingsPage() {
  return (
    <Suspense>
      <OrdersListPageContent view="bookings" />
    </Suspense>
  );
}
