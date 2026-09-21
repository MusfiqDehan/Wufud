import { BaseGatewayAdapter, InitiateResult, PaymentTx, ValidateResult } from "./base.adapter";

export class StubAdapter extends BaseGatewayAdapter {
  async initiate(tx: PaymentTx): Promise<InitiateResult> {
    return {
      gateway_url: `${this.urls.success_url}?tran_id=${tx.tranId}&val_id=stub-${tx.tranId}`,
      raw: { id: `stub-${tx.tranId}`, stub: true },
    };
  }

  async validate(valId: string): Promise<ValidateResult> {
    return { status: "VALID", amount: 0, currency: "BDT", raw: { valId, stub: true } };
  }
}
