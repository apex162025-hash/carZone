"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { AuthBootstrap } from "@/components/providers/auth-bootstrap";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <AuthBootstrap>
          <TooltipProvider delay={250}>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthBootstrap>
      </QueryProvider>
    </ThemeProvider>
  );
}
