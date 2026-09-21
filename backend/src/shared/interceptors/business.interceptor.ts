import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { mergeMap } from "rxjs";
import { z } from "zod";
import { getTenantStore } from "../../tenancy/tenant-context";
import { AuditLog } from "../../accounts/entities/reconciliation.entity";

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v => Number(v) > 0);
const name = z.string().trim().min(1).max(255);
const uuid = z.string().uuid();
const qty = z.number().int().nonnegative();
const tier = z.object({ name, price: money, seatsTotal: qty, currency: z.literal("BDT").optional() });
const pkg = z.object({ name, kind: z.enum(["hajj", "ramadan_umrah", "offseason_umrah", "ziyarah"]), description: z.string().max(10000).optional(), departureDate: z.coerce.date(), bookingOpensAt: z.coerce.date(), bookingClosesAt: z.coerce.date(), branch: uuid.optional(), isPublished: z.boolean().optional(), isActive: z.boolean().optional() });
const vendor = z.object({ name, kind: z.enum(["hotel", "airline", "transport", "visa", "other"] ) });
const stock = z.object({ name, quantity: qty, unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), salePrice: money.optional(), kind: z.enum(["product", "service"]).optional() });
const expense = z.object({ title: name, amount: money, currency: z.literal("BDT").optional(), category: name.optional() });
const rule = z.object({ daysBeforeDeparture: qty, chargePercent: z.string().refine(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100) });

function schemaFor(method: string, path: string): z.ZodType | undefined {
  const update = method === "PATCH";
  if (method !== "POST" && !update) return;
  if (/\/admin\/packages$/.test(path)) return pkg.extend({ tiers: z.array(tier).min(1) });
  if (/\/admin\/packages\/tiers\/[^/]+$/.test(path)) return tier.partial();
  if (/\/admin\/packages\/[^/]+\/tiers$/.test(path)) return tier;
  if (/\/admin\/packages\/[^/]+$/.test(path)) return pkg.partial();
  if (/\/vendors(?:\/[^/]+)?$/.test(path)) return update ? vendor.partial() : vendor;
  if (/\/stock(?:\/[^/]+)?$/.test(path) && !/\/stock\/issue$/.test(path)) return update ? stock.partial() : stock;
  if (/\/expenses(?:\/[^/]+)?$/.test(path)) return update ? expense.partial() : expense;
  if (/\/cancellation-rules(?:\/[^/]+)?$/.test(path)) return update ? rule.partial() : rule;
  if (/\/manual-payments$/.test(path)) return z.object({ bookingId: uuid, amount: money, method: z.enum(["cash", "card", "bkash", "nagad"]).optional(), branchId: uuid.optional() });
  if (/\/disbursements$/.test(path)) return z.object({ vendorId: uuid, bookingId: uuid.optional(), amountSar: money, fxRate: z.string().regex(/^\d+(\.\d{1,6})?$/).refine(v => Number(v) > 0), note: z.string().max(2000).optional() });
  if (/\/stock\/issue$/.test(path)) return z.object({ itemId: uuid, quantity: qty.positive(), bookingId: uuid.optional() });
  if (/\/bookings\/[^/]+\/refunds$/.test(path)) return z.object({ amount: money });
  if (/\/bookings\/[^/]+\/cancel$/.test(path)) return z.object({ pilgrimIds: z.array(uuid).min(1).optional() });
  if (/\/bookings$/.test(path)) return z.object({ tierId: uuid, paymentMode: z.enum(["full", "installment"]), branchId: uuid.optional(), pilgrims: z.array(z.object({ fullName: name, passportNumber: name, nationality: z.string().max(100).optional() })).min(1).max(100) });
}

@Injectable()
export class BusinessInterceptor implements NestInterceptor {
  constructor(private readonly em: EntityManager) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const schema = schemaFor(req.method, req.path);
    if (schema) {
      const result = schema.safeParse(req.body);
      if (!result.success) throw new BadRequestException({ message: "Please check the submitted fields.", errors: result.error.flatten().fieldErrors });
      req.body = result.data;
    }
    return next.handle().pipe(mergeMap(async result => {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.user && getTenantStore()?.plane === "tenant") {
        this.em.create(AuditLog, { actorId: req.user.id, action: `${req.method} ${req.route?.path ?? req.path}`, targetType: "request", metadata: { resourceId: req.params?.id } });
        await this.em.flush();
      }
      return result;
    }));
  }
}
