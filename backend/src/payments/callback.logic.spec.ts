import { PaymentsService } from "./payments.service";
import { PaymentAttempt, PlatformPaymentAttempt } from "./entities/payment-attempt.entity";
import * as gateways from "./adapters/factory";
import { tenantAls } from "../tenancy/tenant-context";

describe.each([false, true])("payment callback (platform=%s)", platform => {
  const validate = jest.fn();
  let attempt: any;
  let service: PaymentsService;
  let markPaid: jest.SpyInstance;
  beforeEach(() => {
    attempt = { id: "attempt", tranId: "transaction", gatewaySlug: "stripe", amount: "100.00", currency: "BDT", valId: "trusted-session", status: "pending" };
    const em: any = {
      findOne: jest.fn(async (entity: any) => entity === PlatformPaymentAttempt ? (platform ? attempt : null) : entity === PaymentAttempt ? attempt : null),
      findOneOrFail: jest.fn(async () => attempt), flush: jest.fn(),
    };
    em.transactional = (fn: any) => fn(em);
    service = new PaymentsService(em, { completePaid: jest.fn() } as any);
    markPaid = jest.spyOn(service as any, "markSourcePaid").mockResolvedValue(undefined);
    jest.spyOn(gateways, "getGateway").mockReturnValue({ validate } as any);
    validate.mockResolvedValue({ status: "VALID", amount: 100, currency: "BDT", raw: {} });
  });
  afterEach(() => jest.restoreAllMocks());
  const callback = (input: any) => tenantAls.run({ schema: "t_test", host: "test.wufud.localhost", plane: "tenant" }, () => service.handleCallback({ tranId: "transaction", ...input }));

  it("rejects another session on repeated callbacks without poisoning the trusted ID", async () => {
    for (let i = 0; i < 2; i++) await expect(callback({ valId: "other-session", status: "success" })).rejects.toThrow("session");
    expect(attempt.valId).toBe("trusted-session");
    expect(attempt.status).toBe("pending");
    expect(markPaid).not.toHaveBeenCalled();
  });
  it("allows verified success after failure and ignores duplicates and late cancellations", async () => {
    await callback({ status: "failed" });
    await callback({ valId: "trusted-session", status: "success" });
    await callback({ valId: "trusted-session", status: "success" });
    await callback({ status: "cancelled" });
    expect(attempt.status).toBe("success");
    expect(markPaid).toHaveBeenCalledTimes(platform ? 0 : 1);
  });
  it.each([{ amount: 100.4, currency: "BDT" }, { amount: 100, currency: "USD" }])("rejects mismatched validation %j", async result => {
    validate.mockResolvedValue({ status: "VALID", ...result, raw: {} });
    await callback({ valId: "trusted-session", status: "success" });
    expect(attempt.status).toBe("failed");
    expect(markPaid).not.toHaveBeenCalled();
  });
});
