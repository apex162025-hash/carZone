import { Suspense } from "react";

import NotificationsPageContent from "@/components/modules/Notifications/NotificationsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/notifications");

export default function NotificationsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <NotificationsPageContent />
    </Suspense>
  );
}
