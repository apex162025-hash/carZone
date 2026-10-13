import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@tanstack/react-query",
      "@base-ui/react",
      "sonner",
    ],
  },

  async headers() {
    // Admin data is user-specific and changes constantly — never edge-cache HTML or API.
    const noStore = {
      key: "Cache-Control",
      value: "private, no-store, no-cache, max-age=0, must-revalidate",
    } as const;

    return [
      { source: "/(.*)", headers: [noStore] },
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
