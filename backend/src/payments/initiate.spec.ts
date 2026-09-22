import { PaymentsService } from "./payments.service";
import * as gateways from "./adapters/factory";

it.each([false, true])("assigns distinct unpredictable transaction IDs (platform=%s)", async platform => {
  const em: any = {
    findOneOrFail: jest.fn(async () => ({ currency: "BDT", status: "held" })),
    findOne: jest.fn(async () => ({ isEnabledForTenants: true, configSchema: [], credentials: {}, platformCredentials: {} })),
    create: jest.fn((_entity, data) => data), persistAndFlush: jest.fn(),
  };
  const gateway = jest.spyOn(gateways, "getGateway").mockReturnValue({ initiate: async () => ({ gateway_url: "https://example.com", raw: { id: "session" } }) } as any);
  try {
    const service = new PaymentsService(em, {} as any);
    const results = await Promise.all(Array.from({ length: 20 }, () => platform
      ? service.initiatePlatform("same-source", "stripe", "100", "BDT", "wufud.localhost")
      : service.initiate("same-source", "stripe", "100", "BDT", "demo.wufud.localhost", "owner")));
    expect(new Set(results.map(r => r.tran_id)).size).toBe(results.length);
    for (const result of results) expect(result.tran_id).toMatch(/^(TXN|SUB)-[a-f0-9]{24}$/);
  } finally { gateway.mockRestore(); }
});
