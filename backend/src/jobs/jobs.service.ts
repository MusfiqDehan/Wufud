import { EntityManager } from "@mikro-orm/postgresql";
import { RequestContext } from "@mikro-orm/core";
import { Tenant } from "../tenancy/entities/tenant.entity";
import { tenantAls } from "../tenancy/tenant-context";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { BookingService } from "../booking/booking.service";
import { AccountsService } from "../accounts/accounts.service";
import { env } from "../shared/config/env";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly em: EntityManager,
    private readonly bookings: BookingService,
    private readonly accounts: AccountsService,
  ) {}

  async onModuleInit() {
    try {
      const connection = { url: env.REDIS_URL };
      this.queue = new Queue("wufud", { connection });
      this.worker = new Worker(
        "wufud",
        async (job) => {
          const tenants = await this.em.fork().find(Tenant, { isEnabled: true, status: { $in: ["active", "trial"] } });
          for (const tenant of tenants) {
            const em = this.em.fork({ schema: tenant.schemaName });
            await tenantAls.run({ tenant, schema: tenant.schemaName, plane: "tenant", host: `${tenant.slug}.${env.PLATFORM_HOST}` }, () => RequestContext.create(em, async () => {
              if (job.name === "release-holds") await this.bookings.releaseExpiredHolds();
              if (job.name === "mark-overdue") await this.bookings.markOverdue();
              if (job.name === "snapshot") await this.accounts.snapshot();
            }));
          }
        },
        { connection },
      );
      await this.queue.add("release-holds", {}, { repeat: { every: 60_000 } });
      await this.queue.add("mark-overdue", {}, { repeat: { every: 3600_000 } });
      await this.queue.add("snapshot", {}, { repeat: { every: 86400_000 } });
    } catch (err) {
      this.logger.warn(`Jobs disabled: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
