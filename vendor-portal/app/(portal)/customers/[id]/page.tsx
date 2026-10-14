import CustomerDetailsPageContent from "@/components/modules/Customers/CustomerDetailsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/customers/[id]");

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailsPageContent id={id} />;
}
