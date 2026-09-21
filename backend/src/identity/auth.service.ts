import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../shared/errors/domain.error";
import { User } from "./entities/user.entity";
import { Invitation } from "./entities/invitation.entity";
import { Tenant } from "../tenancy/entities/tenant.entity";
import { Domain } from "../tenancy/entities/domain.entity";
import { env } from "../shared/config/env";
import { webOriginForHost } from "../shared/config/web-origin";
import { getTenantStore } from "../tenancy/tenant-context";
import { ProvisioningService } from "../tenancy/provisioning.service";
import { Role } from "../access/entities/role.entity";
import { UserRole } from "../access/entities/user-role.entity";
import { PlatformRole } from "../access/entities/platform-role.entity";
import { PlatformUserRole } from "../access/entities/platform-user-role.entity";
import { MailService } from "../mail/mail.service";
import { Plan } from "../platform/entities/plan.entity";
import { formatInviteWindow } from "./invite-window";

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwt: JwtService,
    private readonly provisioning: ProvisioningService,
    private readonly mail: MailService,
  ) {}

  async register(input: { email: string; password: string; fullName: string; agencyName?: string }) {
    const email = input.email.toLowerCase();
    const existing = await this.em.findOne(User, { email });
    if (existing) {
      throw DomainError.conflict("That email is already in use.", { email: ["That email is already in use."] });
    }
    const store = getTenantStore();
    let tenant = store?.tenant;
    if (!tenant && input.agencyName) {
      const slug = input.agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      tenant = await this.provisioning.provision({ name: input.agencyName, slug, ownerEmail: email });
    }
    const user = this.em.create(User, {
      email,
      fullName: input.fullName,
      tenant,
      emailVerified: true,
      passwordHash: await argon2.hash(input.password),
      passwordSetAt: new Date(),
    });
    await this.em.persistAndFlush(user);
    if (tenant) {
      const roleSlug = input.agencyName ? "admin" : "pilgrim";
      await this.assignTenantRole(tenant.schemaName, user, roleSlug);
    }
    const tokens = await this.issue(user);
    user.refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.em.flush();
    return { user, ...tokens };
  }

  async storefrontSession(input: { email: string; password: string; fullName?: string }) {
    const store = getTenantStore();
    if (!store?.tenant) {
      throw new DomainError(ErrorCode.TENANT_NOT_FOUND, "Bookings can only be created on an agency site.");
    }
    const email = input.email.toLowerCase();
    const existing = await this.em.findOne(User, { email });
    if (existing) {
      return this.login(email, input.password);
    }
    try {
      return await this.register({
        email,
        password: input.password,
        fullName: input.fullName?.trim() || email,
      });
    } catch (err) {
      if (err instanceof DomainError && err.errorCode === ErrorCode.DUPLICATE_RESOURCE) {
        return this.login(email, input.password);
      }
      throw err;
    }
  }

  async login(email: string, password: string) {
    const user = await this.em.findOne(User, { email: email.toLowerCase() }, { populate: ["tenant"] });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw DomainError.unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }
    if (!user.isActive || user.isDeleted) {
      throw DomainError.unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }
    user.lastLogin = new Date();
    const tokens = await this.issue(user);
    user.refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.em.flush();
    return { user, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });
      const user = await this.em.findOne(User, { id: payload.sub }, { populate: ["tenant"] });
      if (!user?.refreshTokenHash || !(await argon2.verify(user.refreshTokenHash, refreshToken))) {
        throw DomainError.unauthorized(ErrorCode.TOKEN_EXPIRED);
      }
      return this.issue(user);
    } catch {
      throw DomainError.unauthorized(ErrorCode.TOKEN_EXPIRED);
    }
  }

  async invite(input: {
    email: string;
    fullName?: string;
    type: Invitation["type"];
    tenantId?: string;
    metadata?: Record<string, unknown>;
    invitedById?: string;
    plane?: "platform" | "tenant";
    expiresInHours?: number;
  }) {
    const hours = Math.max(1, input.expiresInHours ?? (await this.defaultInviteHours(input.tenantId)));
    const token = randomBytes(24).toString("hex");
    const invitation = this.em.create(Invitation, {
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      tokenHash: hashToken(token),
      type: input.type,
      expiresAt: new Date(Date.now() + hours * 3600000),
      invitedById: input.invitedById,
      tenantId: input.tenantId,
      metadata: input.metadata,
    });
    await this.em.persistAndFlush(invitation);
    const acceptUrl = await this.inviteAcceptUrl(token, input.tenantId);
    const workspace = await this.inviteWorkspaceName(input.tenantId);
    const window = formatInviteWindow(hours);
    let emailSent = false;
    try {
      const result = await this.mail.send({
        plane: input.plane ?? (input.type === "employee" ? "tenant" : "platform"),
        to: invitation.email,
        subject: `You're invited to ${workspace} on Wufud`,
        text: [
          `You've been invited to join ${workspace} on Wufud.`,
          `Open this link to set your password: ${acceptUrl}`,
          `This invitation expires in ${window}.`,
        ].join("\n\n"),
        html: `<p>You've been invited to join <strong>${workspace}</strong> on Wufud.</p>
<p><a href="${acceptUrl}">Accept invitation and set your password</a></p>
<p>This invitation expires in ${window}. If the button does not work, copy this URL:</p>
<p><code>${acceptUrl}</code></p>`,
      });
      emailSent = result.sent;
    } catch {
      emailSent = false;
    }
    return { invitation, token, emailSent, acceptUrl };
  }

  async createOwnerFromHash(
    input: { tenant: Tenant; email: string; fullName: string; passwordHash: string },
    em: EntityManager = this.em,
  ) {
    const email = input.email.toLowerCase();
    const existing = await em.findOne(User, { email });
    if (existing) {
      throw DomainError.conflict("That email is already in use.", { email: ["That email is already in use."] });
    }
    const user = em.create(User, {
      email,
      fullName: input.fullName,
      tenant: input.tenant,
      emailVerified: true,
      passwordHash: input.passwordHash,
      passwordSetAt: new Date(),
    });
    await em.persistAndFlush(user);
    await this.assignTenantRole(input.tenant.schemaName, user, "admin", em);
    return user;
  }

  async acceptInvite(token: string, password: string, fullName?: string) {
    const invitation = await this.em.findOne(Invitation, { tokenHash: hashToken(token) });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw DomainError.notFound("This invitation link is invalid or has expired.");
    }
    let user = await this.em.findOne(User, { email: invitation.email });
    const tenant = invitation.tenantId ? await this.em.findOne(Tenant, { id: invitation.tenantId }) : null;
    if (!user) {
      user = this.em.create(User, {
        email: invitation.email,
        fullName: fullName ?? invitation.fullName ?? invitation.email,
        passwordHash: await argon2.hash(password),
        passwordSetAt: new Date(),
        emailVerified: true,
        tenant: tenant ?? undefined,
      });
      await this.em.persistAndFlush(user);
    } else {
      user.passwordHash = await argon2.hash(password);
      user.passwordSetAt = new Date();
      if (tenant) user.tenant = tenant;
      await this.em.flush();
    }
    const roleSlug = String(invitation.metadata?.role_slug ?? invitation.metadata?.roleSlug ?? (invitation.type === "tenant_owner" ? "admin" : "agent"));
    if (tenant && roleSlug) {
      await this.assignTenantRole(tenant.schemaName, user, roleSlug);
    }
    invitation.acceptedAt = new Date();
    await this.em.flush();
    return this.issue(user);
  }

  private async issue(user: User) {
    const payload = { sub: user.id, email: user.email, tenantId: user.tenant?.id ?? null };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL as unknown as number,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_TTL as unknown as number,
    });
    return { accessToken, refreshToken, user };
  }

  private async assignTenantRole(schema: string, user: User, slug: string, em: EntityManager = this.em) {
    const knex = em.getConnection().getKnex();
    const role = await knex(`${schema}.roles`).where({ slug }).first();
    if (!role) return;
    const existing = await knex(`${schema}.user_roles`).where({ user_id: user.id, role_id: role.id }).first();
    if (existing) return;
    const { v7 } = await import("uuid");
    await knex(`${schema}.user_roles`).insert({
      id: v7(),
      user_id: user.id,
      user_email: user.email,
      role_id: role.id,
    });
  }

  private async inviteAcceptUrl(token: string, tenantId?: string) {
    let host = env.PLATFORM_HOST;
    if (tenantId) {
      const domain = await this.em.findOne(Domain, { tenant: tenantId, isPrimary: true });
      if (domain?.domain) host = domain.domain;
    }
    return `${webOriginForHost(host)}/invite?token=${encodeURIComponent(token)}`;
  }

  private async inviteWorkspaceName(tenantId?: string) {
    if (!tenantId) return "Wufud";
    const tenant = await this.em.findOne(Tenant, { id: tenantId });
    return tenant?.name ?? "Wufud";
  }

  private async defaultInviteHours(tenantId?: string) {
    if (!tenantId) return 168;
    const tenant = await this.em.findOne(Tenant, { id: tenantId });
    if (!tenant?.plan) return 168;
    const plan = await this.em.findOne(Plan, { slug: tenant.plan });
    return plan?.invitationExpiresHours ?? 168;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

void Role;
void UserRole;
void PlatformRole;
void PlatformUserRole;
