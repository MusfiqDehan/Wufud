import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionLevel } from "@wufud/contracts";
import { RbacService } from "./rbac.service";
import { IS_PUBLIC } from "../shared/decorators/public.decorator";
import { DomainError } from "../shared/errors/domain.error";

export const REQUIRE_FEATURE = "requireFeature";
export const RequireFeature = (key: string, level: PermissionLevel = "view") =>
  SetMetadata(REQUIRE_FEATURE, { key, level });

@Injectable()
export class RequireFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const meta = this.reflector.getAllAndOverride<{ key: string; level: PermissionLevel }>(REQUIRE_FEATURE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user) throw DomainError.unauthorized();
    await this.rbac.require(user, meta.key, meta.level);
    return true;
  }
}
