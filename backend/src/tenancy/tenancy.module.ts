import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TenantResolverMiddleware } from "./tenant-resolver.middleware";
import { ProvisioningService } from "./provisioning.service";
import { TraefikSyncService } from "./traefik-sync.service";
import { PublicContextController } from "./public.controller";
import { SchemaInterceptor } from "./schema.interceptor";

@Module({
  controllers: [PublicContextController],
  providers: [ProvisioningService, TraefikSyncService, SchemaInterceptor],
  exports: [ProvisioningService, TraefikSyncService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes("*");
  }
}
