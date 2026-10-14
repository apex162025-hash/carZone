"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { resolveUserFacingError } from "@/lib/api/api-error-handler";
import { CACHE_TTL_DYNAMIC } from "@/lib/cache/ttl";

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (mutation.meta?.skipErrorToast) return;
            toast.error(resolveUserFacingError(error, "حدث خطأ، حاول مرة أخرى"));
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: CACHE_TTL_DYNAMIC * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
