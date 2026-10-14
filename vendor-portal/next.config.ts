import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
// npm workspaces: dependencies are hoisted to the monorepo root and shared packages live in ../packages.
const monorepoRoot = path.join(projectRoot, "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@carzen/ui", "@carzen/contracts", "@carzen/platform-api"],
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
    // Vendor data is account-specific and changes constantly — never edge-cache HTML or API.
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
