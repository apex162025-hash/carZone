import ComplaintDetailsPageContent from "@/components/modules/Complaints/ComplaintDetailsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/complaints/[id]");

export default async function ComplaintDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComplaintDetailsPageContent id={id} />;
}
