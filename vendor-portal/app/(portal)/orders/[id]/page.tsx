import OrderDetailsPageContent from "@/components/modules/Orders/OrderDetailsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/orders/[id]");

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailsPageContent id={id} />;
}
