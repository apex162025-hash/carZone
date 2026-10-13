import ApplicationDetailsPageContent from "@/components/modules/Applications/ApplicationDetailsPageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/applications/[id]");

export default async function ApplicationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationDetailsPageContent id={id} />;
}
