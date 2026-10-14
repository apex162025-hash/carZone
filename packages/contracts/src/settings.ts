import type { Localized } from "./common";
import type { BranchSettings } from "./washes";

export interface CatalogArea {
  id: string;
  name: Localized;
  active: boolean;
}

export interface CatalogCategory {
  id: string;
  name: Localized;
  active: boolean;
}

export interface CatalogAmenity {
  id: string;
  name: Localized;
  active: boolean;
}

export interface PlatformSettings {
  general: {
    platformName: string;
    currency: string;
    supportPhone: string;
    supportEmail: string;
    supportHours: Localized;
  };
  bookingDefaults: BranchSettings;
  legal: {
    terms: Localized;
    privacy: Localized;
  };
  catalogs: {
    areas: CatalogArea[];
    serviceCategories: CatalogCategory[];
    amenities: CatalogAmenity[];
  };
  notificationTemplates: {
    id: string;
    event: string;
    audience: string;
    title: Localized;
    body: Localized;
  }[];
}

export type SettingsSection = "general" | "bookingDefaults" | "legal" | "catalogs";

export interface UpdateSettingsPayload<S extends SettingsSection = SettingsSection> {
  section: S;
  value: PlatformSettings[S];
  reason: string;
}
