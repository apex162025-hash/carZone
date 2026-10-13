import { Suspense } from "react";

import TransactionsPageContent from "@/components/modules/Finance/TransactionsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/finance/transactions");

export default function TransactionsPage() {
  // useSearchParams (URL filter state) needs a Suspense boundary.
  return (
    <Suspense>
      <TransactionsPageContent />
    </Suspense>
  );
}
