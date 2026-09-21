import { Logger } from "@nestjs/common";
import { env } from "../../shared/config/env";
import { DomainError } from "../../shared/errors/domain.error";
import { ErrorCode, ERROR_MESSAGES } from "@wufud/contracts";
import { BaseGatewayAdapter, InitiateResult, PaymentTx, ValidateResult } from "./base.adapter";

export class SslcommerzAdapter extends BaseGatewayAdapter {
  private readonly logger = new Logger(SslcommerzAdapter.name);
  private get base() {
    return this.isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  }

  async initiate(tx: PaymentTx): Promise<InitiateResult> {
    const body = new URLSearchParams({
      store_id: this.credentials.store_id ?? "",
      store_passwd: this.credentials.store_password ?? "",
      total_amount: Number(tx.amount).toFixed(2),
      currency: tx.currency,
      tran_id: tx.tranId,
      success_url: this.urls.success_url,
      fail_url: this.urls.fail_url,
      cancel_url: this.urls.cancel_url,
      ipn_url: this.urls.ipn_url,
      cus_name: tx.customerName || "Pilgrim",
      cus_email: tx.customerEmail || "noreply@wufud.local",
      cus_phone: tx.customerPhone || env.SSLCOMMERZ_FALLBACK_PHONE,
      cus_add1: "N/A",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: "Pilgrimage booking",
      product_category: "service",
      product_profile: "service",
    });
    const res = await fetch(`${this.base}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const raw = (await res.json()) as Record<string, unknown>;
    const url = (raw.GatewayPageURL ?? raw.redirectGatewayURL) as string | undefined;
    if (raw.status !== "SUCCESS" || !url) {
      this.logger.warn(`SSLCommerz init failed: ${String(raw.failedreason ?? raw.status ?? "unknown")}`);
      throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, ERROR_MESSAGES.GATEWAY_UNAVAILABLE, 502);
    }
    return { gateway_url: url, raw };
  }

  async validate(valId: string): Promise<ValidateResult> {
    const url = new URL(`${this.base}/validator/api/validationserverAPI.php`);
    url.searchParams.set("val_id", valId);
    url.searchParams.set("store_id", this.credentials.store_id ?? "");
    url.searchParams.set("store_passwd", this.credentials.store_password ?? "");
    url.searchParams.set("format", "json");
    const res = await fetch(url);
    const raw = (await res.json()) as Record<string, unknown>;
    const ok = raw.status === "VALID" || raw.status === "VALIDATED";
    return {
      status: ok ? "VALID" : "FAILED",
      amount: Number(raw.amount ?? 0),
      currency: String(raw.currency ?? "BDT"),
      raw,
    };
  }
}
