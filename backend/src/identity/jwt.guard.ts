import { getTenantStore } from "../tenancy/tenant-context";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { EntityManager } from "@mikro-orm/postgresql";
import { IS_PUBLIC } from "../shared/decorators/public.decorator";
import { DomainError } from "../shared/errors/domain.error";
import { env } from "../shared/config/env";
import { User } from "./entities/user.entity";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    if (!header?.startsWith("Bearer ")) {
      if (isPublic) return true;
      throw DomainError.unauthorized();
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7), {
        secret: env.JWT_ACCESS_SECRET,
      });
      const user = await this.em.findOne(User, { id: payload.sub }, { populate: ["tenant"] });
      if (!user) {
        if (isPublic) return true;
        throw DomainError.unauthorized();
      }
      const tenant = getTenantStore()?.tenant;
      if (tenant && user.tenant?.id !== tenant.id) throw DomainError.forbidden("Sign in on your own agency website.");
      req.user = user;
      return true;
    } catch (err) {
      if (isPublic) return true;
      if (err instanceof DomainError) throw err;
      throw DomainError.unauthorized();
    }
  }
}
