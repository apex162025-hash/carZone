import { Suspense } from "react";

import SettingsPageContent from "@/components/modules/Settings/SettingsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/settings");

export default function SettingsPage() {
  // The active tab lives in the URL (?tab=) → useSearchParams needs a Suspense boundary.
  return (
    <Suspense>
      <SettingsPageContent />
    </Suspense>
  );
}
