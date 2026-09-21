import { PosSale } from "../accounts/entities/pos.entity";
import { Asset, AssetRelation } from "../shared/entities/asset.entity";
import { Tenant } from "../tenancy/entities/tenant.entity";
import { Domain } from "../tenancy/entities/domain.entity";
import { PlatformDomain } from "../tenancy/entities/platform-domain.entity";
import { User } from "../identity/entities/user.entity";
import { Invitation } from "../identity/entities/invitation.entity";
import { Branch } from "../access/entities/branch.entity";
import { Role } from "../access/entities/role.entity";
import { RolePermission } from "../access/entities/role-permission.entity";
import { UserRole } from "../access/entities/user-role.entity";
import { PlatformRole, PlatformRolePermission } from "../access/entities/platform-role.entity";
import { PlatformUserRole } from "../access/entities/platform-user-role.entity";
import { Plan } from "../platform/entities/plan.entity";
import { AgencySignup } from "../platform/entities/agency-signup.entity";
import { TenantSubscription, SubscriptionInvoice } from "../platform/entities/subscription.entity";
import { TenantFeatureOverride } from "../platform/entities/feature-override.entity";
import { PlatformSeoSettings, PlatformAuditLog } from "../platform/entities/seo-settings.entity";
import { PaymentGatewayCatalog } from "../payments/entities/gateway-catalog.entity";
import { TenantGatewayInstance } from "../payments/entities/tenant-gateway.entity";
import { PlatformEmailAccount } from "../mail/entities/platform-email.entity";
import { TenantEmailAccount } from "../mail/entities/tenant-email.entity";
import {
  PaymentAttempt,
  PlatformPaymentAttempt,
  WebhookEvent,
} from "../payments/entities/payment-attempt.entity";
import { TravelPackage, PackageTier } from "../booking/entities/package.entity";
import { Booking, BookingPilgrim, SeatHold } from "../booking/entities/booking.entity";
import { InstallmentPlan, Installment } from "../booking/entities/installment.entity";
import { CancellationRule, Cancellation, RefundRequest } from "../booking/entities/cancellation.entity";
import { Payment, ManualPayment } from "../accounts/entities/payment.entity";
import { Vendor, VendorDisbursement } from "../accounts/entities/vendor.entity";
import { StockItem, StockIssue, Expense } from "../accounts/entities/stock.entity";
import {
  SettlementReport,
  ReconciliationItem,
  DailyBookingStat,
  AuditLog,
  TenantSettings,
} from "../accounts/entities/reconciliation.entity";

export const PUBLIC_ENTITIES = [
  Asset,
  Tenant,
  Domain,
  PlatformDomain,
  User,
  Invitation,
  PlatformRole,
  PlatformRolePermission,
  PlatformUserRole,
  Plan,
  AgencySignup,
  TenantSubscription,
  SubscriptionInvoice,
  TenantFeatureOverride,
  PlatformSeoSettings,
  PlatformAuditLog,
  PaymentGatewayCatalog,
  PlatformPaymentAttempt,
  PlatformEmailAccount,
];

export const TENANT_ENTITIES = [
  PosSale,
  AssetRelation,
  Branch,
  Role,
  RolePermission,
  UserRole,
  TenantGatewayInstance,
  TenantEmailAccount,
  PaymentAttempt,
  WebhookEvent,
  TravelPackage,
  PackageTier,
  Booking,
  BookingPilgrim,
  SeatHold,
  InstallmentPlan,
  Installment,
  CancellationRule,
  Cancellation,
  RefundRequest,
  Payment,
  ManualPayment,
  Vendor,
  VendorDisbursement,
  StockItem,
  StockIssue,
  Expense,
  SettlementReport,
  ReconciliationItem,
  DailyBookingStat,
  AuditLog,
  TenantSettings,
];

export const ALL_ENTITIES = [...PUBLIC_ENTITIES, ...TENANT_ENTITIES];
