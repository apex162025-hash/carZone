import "server-only";

import type { VendorRouteDef } from "../router";
import { vendorAuthRoutes } from "./auth";
import { vendorCatalogRoutes } from "./catalog";
import { vendorDashboardRoutes } from "./dashboard";
import { vendorInsightRoutes } from "./insights";
import { vendorOperationRoutes } from "./operations";
import { vendorTeamRoutes } from "./team";

/** Vendor (wash owner / branch manager) namespace — `/api/v1/vendor/*`. */
export const VENDOR_ROUTES: VendorRouteDef[] = [
  ...vendorAuthRoutes,
  ...vendorDashboardRoutes,
  ...vendorOperationRoutes,
  ...vendorCatalogRoutes,
  ...vendorTeamRoutes,
  ...vendorInsightRoutes,
];
