import AdminsPageContent from "@/components/modules/Admins/AdminsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/admins");

export default function AdminsPage() {
  return <AdminsPageContent />;
}
