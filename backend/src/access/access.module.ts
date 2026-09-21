import { Global, Module } from "@nestjs/common";
import { RbacService } from "./rbac.service";
import { RequireFeatureGuard } from "./require-feature.guard";
import { AccessController } from "./access.controller";

@Global()
@Module({
  controllers: [AccessController],
  providers: [RbacService, RequireFeatureGuard],
  exports: [RbacService, RequireFeatureGuard],
})
export class AccessModule {}
