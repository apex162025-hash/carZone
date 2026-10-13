import CommissionPageContent from "@/components/modules/Finance/CommissionPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/finance/commission");

export default function CommissionPage() {
  return <CommissionPageContent />;
}
