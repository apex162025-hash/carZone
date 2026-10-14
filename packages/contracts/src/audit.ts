import type { ListParams } from "./common";
import type { ActorType } from "./orders";

export interface AuditLog {
  id: string;
  actorType: ActorType;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  branchId: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  at: string;
  /** Snapshot of the actor name at the time of the action. */
  actorName?: string;
}

export interface AuditLogListItem extends AuditLog {
  actorName: string;
}

export type AuditListMeta = {
  actions: string[];
  entities: string[];
  actors: { id: string; name: string }[];
};

export interface AuditListParams extends ListParams {
  actorId?: string;
  action?: string;
  entity?: string;
  actorType?: ActorType | "all";
}
