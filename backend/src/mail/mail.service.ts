import { Injectable, Logger } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { DomainError } from "../shared/errors/domain.error";
import { applyExclusiveDefault, ensureDefaultExists } from "../shared/utils/exclusive-default";
import { env } from "../shared/config/env";
import { PlatformEmailAccount } from "./entities/platform-email.entity";
import { TenantEmailAccount } from "./entities/tenant-email.entity";
import { EmailWriteBody, publicEmail, PublicEmailAccount } from "./mail.mapper";

type AccountEntity = PlatformEmailAccount | TenantEmailAccount;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly em: EntityManager) {}

  listPlatform() {
    return this.list(PlatformEmailAccount);
  }

  listTenant() {
    return this.list(TenantEmailAccount);
  }

  savePlatform(body: EmailWriteBody) {
    return this.save(PlatformEmailAccount, body);
  }

  saveTenant(body: EmailWriteBody) {
    return this.save(TenantEmailAccount, body);
  }

  deletePlatform(id: string) {
    return this.remove(PlatformEmailAccount, id);
  }

  deleteTenant(id: string) {
    return this.remove(TenantEmailAccount, id);
  }

  setDefaultPlatform(id: string) {
    return this.setDefault(PlatformEmailAccount, id);
  }

  setDefaultTenant(id: string) {
    return this.setDefault(TenantEmailAccount, id);
  }

  async sendTest(plane: "platform" | "tenant", id: string, to: string) {
    const Entity = plane === "platform" ? PlatformEmailAccount : TenantEmailAccount;
    const row = await this.em.findOne(Entity, { id, isDeleted: false });
    if (!row) throw DomainError.notFound("Email account not found.");
    await this.dispatch(row, {
      to,
      subject: `Wufud test message · ${row.label}`,
      text: `This is a test from the "${row.label}" mailbox. If you received it, the account is working.`,
      html: `<p>This is a test from the <strong>${escapeHtml(row.label)}</strong> mailbox.</p><p>If you received it, the account is working.</p>`,
    });
    return { sent: true, to };
  }

  async send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    plane?: "platform" | "tenant";
  }): Promise<{ sent: boolean; from?: string }> {
    const account = await this.resolveAccount(input.plane ?? "platform");
    if (!account) {
      this.logger.warn(`No email account configured; skipped send to ${input.to}`);
      return { sent: false };
    }
    await this.dispatch(account, input);
    return { sent: true, from: account.fromAddress };
  }

  private async list(Entity: typeof PlatformEmailAccount | typeof TenantEmailAccount): Promise<PublicEmailAccount[]> {
    const rows = await this.em.find(Entity, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
    const synced = await this.persistDefaults(rows);
    return synced.map(publicEmail);
  }

  private async save(Entity: typeof PlatformEmailAccount | typeof TenantEmailAccount, body: EmailWriteBody): Promise<PublicEmailAccount> {
    const id = body.id;
    let row = id ? await this.em.findOne(Entity, { id, isDeleted: false }) : null;
    if (!row) {
      row = this.em.create(Entity, {
        label: body.label?.trim() || "SMTP",
        host: body.host?.trim() || "",
        port: Number(body.port ?? 465),
        username: body.username?.trim() || "",
        password: body.password?.trim() || undefined,
        fromAddress: body.fromAddress?.trim() || body.username?.trim() || "",
        fromName: body.fromName?.trim() || undefined,
        useSsl: body.useSsl ?? Number(body.port ?? 465) === 465,
        isDefault: Boolean(body.isDefault),
      } as AccountEntity);
      this.em.persist(row);
    } else {
      if (body.label !== undefined) row.label = body.label.trim();
      if (body.host !== undefined) row.host = body.host.trim();
      if (body.port !== undefined) row.port = Number(body.port);
      if (body.username !== undefined) row.username = body.username.trim();
      if (body.password !== undefined && String(body.password).trim()) row.password = String(body.password).trim();
      if (body.fromAddress !== undefined) row.fromAddress = body.fromAddress.trim();
      if (body.fromName !== undefined) row.fromName = body.fromName.trim() || undefined;
      if (body.useSsl !== undefined) row.useSsl = Boolean(body.useSsl);
      if (body.isDefault) row.isDefault = true;
    }
    await this.em.flush();
    const all = await this.em.find(Entity, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
    if (body.isDefault) {
      await this.persistDefaults(all, row.id);
    } else {
      await this.persistDefaults(all);
    }
    const fresh = await this.em.findOneOrFail(Entity, { id: row.id });
    return publicEmail(fresh);
  }

  private async remove(Entity: typeof PlatformEmailAccount | typeof TenantEmailAccount, id: string): Promise<PublicEmailAccount[]> {
    const row = await this.em.findOne(Entity, { id, isDeleted: false });
    if (!row) throw DomainError.notFound("Email account not found.");
    row.softDelete();
    row.isDefault = false;
    await this.em.flush();
    const remaining = await this.em.find(Entity, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
    await this.persistDefaults(remaining);
    return remaining.map(publicEmail);
  }

  private async setDefault(Entity: typeof PlatformEmailAccount | typeof TenantEmailAccount, id: string): Promise<PublicEmailAccount> {
    const rows = await this.em.find(Entity, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
    if (!rows.some((r) => r.id === id)) throw DomainError.notFound("Email account not found.");
    await this.persistDefaults(rows, id);
    return publicEmail(rows.find((r) => r.id === id)!);
  }

  private async persistDefaults(rows: AccountEntity[], forceId?: string) {
    const snapshot = rows.map((r) => ({ id: r.id, isDefault: r.isDefault }));
    const next = forceId ? applyExclusiveDefault(snapshot, forceId) : ensureDefaultExists(snapshot);
    const byId = new Map(next.map((r) => [r.id, r.isDefault]));
    for (const row of rows) {
      const want = byId.get(row.id) ?? false;
      if (row.isDefault !== want) row.isDefault = want;
    }
    await this.em.flush();
    return rows;
  }

  private async resolveAccount(plane: "platform" | "tenant"): Promise<AccountEntity | EnvMailFallback | null> {
    if (plane === "tenant") {
      const tenantRows = await this.em.find(TenantEmailAccount, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
      const tenant = pickDefault(tenantRows);
      if (tenant) return tenant;
    }
    const platformRows = await this.em.find(PlatformEmailAccount, { isDeleted: false }, { orderBy: { createdAt: "ASC" } });
    const platform = pickDefault(platformRows);
    if (platform) return platform;
    if (env.SMTP_HOST) {
      return {
        kind: "env",
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        username: env.SMTP_USER,
        password: env.SMTP_PASS,
        fromAddress: env.SMTP_FROM,
        fromName: undefined,
        useSsl: env.SMTP_SECURE,
      };
    }
    return null;
  }

  private async dispatch(account: AccountEntity | EnvMailFallback, input: { to: string; subject: string; text: string; html: string }) {
    const host = "host" in account ? account.host : "";
    const port = "port" in account ? account.port : 587;
    const useSsl = "useSsl" in account ? account.useSsl : port === 465;
    const username = "username" in account ? account.username : "";
    const password = "password" in account ? account.password : "";
    const fromAddress = "fromAddress" in account ? account.fromAddress : env.SMTP_FROM;
    const fromName = "fromName" in account ? account.fromName : undefined;
    const options: SMTPTransport.Options = {
      host,
      port,
      secure: useSsl,
    };
    if (username) {
      options.auth = { user: username, pass: (password ?? "").replace(/\s+/g, "") };
    }
    const transport = nodemailer.createTransport(options);
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    await transport.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html });
  }
}

type EnvMailFallback = {
  kind: "env";
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  fromName?: string;
  useSsl: boolean;
};

function pickDefault<T extends { isDefault: boolean }>(rows: T[]): T | undefined {
  return rows.find((r) => r.isDefault) ?? (rows.length === 1 ? rows[0] : undefined);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
