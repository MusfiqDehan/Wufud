import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache/cache.service";
import { HealthController } from "./health/health.controller";

@Global()
@Module({
  controllers: [HealthController],
  providers: [CacheService],
  exports: [CacheService],
})
export class SharedModule {}
