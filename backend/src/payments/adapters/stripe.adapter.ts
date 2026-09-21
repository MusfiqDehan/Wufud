import Stripe from "stripe";
import { BaseGatewayAdapter, InitiateResult, PaymentTx, ValidateResult } from "./base.adapter";

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

function toStripe(amount: number, currency: string) {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100);
}

function fromStripe(amount: number, currency: string) {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100;
}

export class StripeAdapter extends BaseGatewayAdapter {
  private client() {
    return new Stripe(this.credentials.secret_key, { typescript: true });
  }

  async initiate(tx: PaymentTx): Promise<InitiateResult> {
    const session = await this.client().checkout.sessions.create({
      mode: "payment",
      success_url: `${this.urls.success_url}?tran_id=${tx.tranId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.urls.cancel_url}?tran_id=${tx.tranId}`,
      client_reference_id: tx.tranId,
      customer_email: tx.customerEmail,
      metadata: { tran_id: tx.tranId, gateway: "stripe", source_id: tx.sourceRef },
      managed_payments: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: tx.currency.toLowerCase(),
            unit_amount: toStripe(Number(tx.amount), tx.currency),
            product_data: { name: "Pilgrimage booking" },
          },
        },
      ],
    } as any);
    return {
      gateway_url: session.url ?? "",
      raw: { id: session.id, payment_status: session.payment_status, status: session.status, url: session.url },
    };
  }

  async validate(valId: string): Promise<ValidateResult> {
    const session = await this.client().checkout.sessions.retrieve(valId);
    const paid = session.payment_status === "paid";
    return {
      status: paid ? "VALID" : "FAILED",
      amount: fromStripe(session.amount_total ?? 0, session.currency ?? "usd"),
      currency: (session.currency ?? "usd").toUpperCase(),
      raw: { id: session.id, payment_status: session.payment_status },
    };
  }
}
