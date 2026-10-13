import { Suspense } from "react";

import BranchesPageContent from "@/components/modules/Branches/BranchesPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/branches");

export default function BranchesPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <BranchesPageContent />
    </Suspense>
  );
}
