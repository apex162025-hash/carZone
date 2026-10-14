"use client"

import type { CSSProperties } from "react"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      dir="rtl"
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-success" />,
        info: <InfoIcon className="size-[18px] text-info" />,
        warning: <TriangleAlertIcon className="size-[18px] text-warning" />,
        error: <OctagonXIcon className="size-[18px] text-destructive" />,
        loading: <Loader2Icon className="size-[18px] animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "14px",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans !shadow-floating !gap-3 !px-4 !py-3.5",
          title: "text-sm font-medium",
          description: "text-xs !text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
