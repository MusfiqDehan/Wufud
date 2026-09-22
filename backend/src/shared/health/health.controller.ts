import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { EntityManager } from "@mikro-orm/postgresql";
import { Public } from "../decorators/public.decorator";
import { successResponse } from "../interceptors/success.interceptor";
import { CacheService } from "../cache/cache.service";
import { env } from "../config/env";

@ApiTags("Health")
@Controller("api/v1/health")
export class HealthController {
  constructor(
    private readonly em: EntityManager,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Liveness probe",
    description: "Returns service status. No auth required. Used by Docker, Traefik, and CI smoke tests.",
  })
  @ApiResponse({
    status: 200,
    description: "Service is healthy.",
    schema: {
      example: { success: true, message: "Healthy.", data: { status: "ok", service: "wufud-api" } },
    },
  })
  check() {
    return successResponse({ status: "ok", service: "wufud-api" }, "Healthy.");
  }

  @Public()
  @Get("detailed")
  @ApiOperation({
    summary: "Detailed health and status probe",
    description: "Returns comprehensive status including database, cache, uptime, and latency.",
  })
  @ApiResponse({
    status: 200,
    description: "System components health status.",
  })
  async detailed() {
    const timestamp = new Date().toISOString();
    const uptimeSeconds = Math.floor(process.uptime());

    // 1. Database check
    let dbStatus: "operational" | "degraded" | "error" = "operational";
    let dbLatencyMs: number | null = null;
    let dbError: string | null = null;

    try {
      const dbStart = Date.now();
      await this.em.getConnection().execute("SELECT 1;");
      dbLatencyMs = Date.now() - dbStart;
    } catch (err: unknown) {
      dbStatus = "error";
      dbError = err instanceof Error ? err.message : "Database connection failed";
    }

    // 2. Redis Cache check
    let redisStatus: "operational" | "degraded" | "error" = "operational";
    let redisLatencyMs: number | null = null;
    let redisError: string | null = null;

    try {
      redisLatencyMs = await this.cache.ping();
    } catch (err: unknown) {
      redisStatus = "degraded";
      redisError = err instanceof Error ? err.message : "Redis cache unavailable";
    }

    // Determine overall system health
    const overallStatus: "operational" | "degraded" | "outage" =
      dbStatus === "operational" && redisStatus === "operational"
        ? "operational"
        : dbStatus === "error"
          ? "outage"
          : "degraded";

    return successResponse(
      {
        status: overallStatus,
        timestamp,
        uptimeSeconds,
        environment: env.NODE_ENV,
        services: {
          api: {
            status: "operational",
            service: "wufud-api",
            version: "1.0.0",
          },
          database: {
            status: dbStatus,
            type: "postgresql",
            latencyMs: dbLatencyMs,
            error: dbError,
          },
          cache: {
            status: redisStatus,
            type: "redis",
            latencyMs: redisLatencyMs,
            error: redisError,
          },
          storage: {
            status: "operational",
            type: "s3_compatible",
          },
          payments: {
            sslcommerz: { status: "operational" },
            stripe: { status: "operational" },
          },
          mail: {
            status: "operational",
            type: "smtp",
          },
        },
      },
      "Detailed health check completed.",
    );
  }
}
