import { Suspense } from "react";

import DashboardPageContent from "@/components/modules/Dashboard/DashboardPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/dashboard");

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageContent />
    </Suspense>
  );
}
