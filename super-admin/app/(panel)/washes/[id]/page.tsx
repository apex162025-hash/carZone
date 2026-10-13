import WashDetailsPageContent from "@/components/modules/Washes/WashDetailsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/washes/[id]");

export default async function WashDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WashDetailsPageContent id={id} />;
}
