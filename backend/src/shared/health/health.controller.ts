import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../decorators/public.decorator";
import { successResponse } from "../interceptors/success.interceptor";

@ApiTags("Health")
@Controller("api/v1/health")
export class HealthController {
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
}
