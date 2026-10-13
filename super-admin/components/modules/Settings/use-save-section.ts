"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useUpdateSettings } from "@/hooks/use-platform";
import { queryKeys } from "@/lib/query-keys";
import type { PlatformSettings, SettingsSection, UpdateSettingsPayload } from "@/types/settings";

/**
 * Per-tab save flow: each settings section owns its reason dialog and pending
 * state, and always sends the full section object (`PUT /settings/:section`).
 */
export function useSaveSection<S extends SettingsSection>(section: S) {
  const queryClient = useQueryClient();
  const update = useUpdateSettings();
  const [reasonOpen, setReasonOpen] = useState(false);

  const save = (value: PlatformSettings[S], reason: string, onSaved?: (saved: PlatformSettings[S]) => void) => {
    const payload = { section, value, reason } as UpdateSettingsPayload;
    update.mutate(payload, {
      onSuccess: (result) => {
        // Settle the form on the saved values immediately (the refetch confirms it).
        queryClient.setQueryData(queryKeys.settings, result.data);
        setReasonOpen(false);
        onSaved?.(result.data[section]);
      },
    });
  };

  return { reasonOpen, setReasonOpen, save, isPending: update.isPending };
}
