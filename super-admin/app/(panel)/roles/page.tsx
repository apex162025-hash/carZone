import RolesPageContent from "@/components/modules/Roles/RolesPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/roles");

export default function RolesPage() {
  return <RolesPageContent />;
}
