export type GatewayUrls = {
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
};

export type InitiateResult = { gateway_url: string; raw: Record<string, unknown> };

export type ValidateResult = {
  status: "VALID" | "FAILED";
  amount: number;
  currency: string;
  raw: Record<string, unknown>;
};

export type PaymentTx = {
  tranId: string;
  amount: string;
  currency: string;
  sourceRef: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export abstract class BaseGatewayAdapter {
  constructor(
    protected readonly credentials: Record<string, string>,
    protected readonly isSandbox: boolean,
    protected readonly urls: GatewayUrls,
  ) {}

  abstract initiate(tx: PaymentTx): Promise<InitiateResult>;
  abstract validate(valId: string): Promise<ValidateResult>;
}
