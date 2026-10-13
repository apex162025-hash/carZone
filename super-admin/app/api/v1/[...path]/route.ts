import { handleMockRequest } from "@/lib/mock-api";

/**
 * Mock Carzen admin API (`/api/v1/*`).
 * Stands in for the Laravel backend until it exists — point NEXT_PUBLIC_API_URL
 * at the real API and this route is simply never called.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: RouteContext) {
  const { path } = await params;
  return handleMockRequest(req, path);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
