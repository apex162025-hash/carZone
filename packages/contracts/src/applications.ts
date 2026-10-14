import type { ListParams, StatusCounts } from "./common";
import type { WorkingDay } from "./washes";

export type ApplicationStatus =
  | "pending"
  | "needs_changes"
  | "approved"
  | "rejected";

export interface ApplicationService {
  name: string;
  price: number;
  durationMin: number;
}

export interface WashApplication {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  services: ApplicationService[];
  workingHours: WorkingDay[];
  capacity: number;
  documents: string[];
  status: ApplicationStatus;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  /** Set once approved: the business created from this application. */
  businessId?: string | null;
}

export type ApplicationListMeta = {
  counts: StatusCounts<ApplicationStatus>;
  pipeline: {
    submitted: number;
    pendingReview: number;
    approved: number;
    onboarding: number;
    active: number;
  };
};

export interface ApplicationListParams extends ListParams {
  status?: ApplicationStatus | "all";
}

export interface ApproveApplicationPayload {
  activateImmediately: boolean;
  note: string;
  checklist: string[];
}

export interface RejectApplicationPayload {
  reason: string;
}

export interface RequestChangesPayload {
  note: string;
}

export interface ApproveApplicationResult {
  application: WashApplication;
  businessId: string;
}
