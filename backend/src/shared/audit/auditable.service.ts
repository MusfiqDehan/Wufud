import { EntityManager } from "@mikro-orm/core";

export type AuditWrite = {
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export abstract class AuditableService {
  constructor(protected readonly em: EntityManager) {}

  protected async writeAudit(_entry: AuditWrite): Promise<void> {
    // Domain modules override or inject a concrete AuditLog entity.
  }
}
