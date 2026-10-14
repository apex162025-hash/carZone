import BranchesPageContent from "@/components/modules/Branches/BranchesPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/branches");

export default function BranchesPage() {
  return <BranchesPageContent />;
}
