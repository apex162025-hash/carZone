import LivePageContent from "@/components/modules/Live/LivePageContent";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/live");

export default function LivePage() {
  return <LivePageContent />;
}
