import { Controller, Get, Req } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { EntityManager } from "@mikro-orm/postgresql";
import { Public } from "../shared/decorators/public.decorator";
import { successResponse } from "../shared/interceptors/success.interceptor";
import { getTenantStore } from "./tenant-context";
import { TenantSettings } from "../accounts/entities/reconciliation.entity";
import { PlatformSeoSettings } from "../platform/entities/seo-settings.entity";
import type { Request } from "express";

@ApiTags("Public")
@Controller("api/v1/public")
export class PublicContextController {
  constructor(private readonly em: EntityManager) { }

  @Public()
  @Get("context")
  @ApiOperation({
    summary: "Resolve site context",
    description:
      "Returns `platform` vs `tenant` plane plus branding for the current host. " +
      "Send `X-Forwarded-Host: demo.wufud.localhost` (or Host) to resolve a tenant storefront.",
  })
  @ApiHeader({ name: "X-Forwarded-Host", required: false, example: "demo.wufud.localhost" })
  @ApiResponse({
    status: 200,
    description: "Tenant context with branding.",
    schema: {
      example: {
        success: true,
        message: "Operation successful.",
        data: {
          plane: "tenant",
          host: "demo.wufud.localhost",
          tenant: { id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd", slug: "demo", name: "Nur Travels" },
          branding: { display_name: "Nur Travels", title: "Nur Travels | Hajj & Umrah" },
        },
      },
    },
  })
  async context(@Req() req: Request) {
    const store = getTenantStore();
    const host = store?.host ?? String(req.headers.host ?? "");
    if (store?.plane === "tenant" && store.tenant) {
      const settings = await this.em.findOne(TenantSettings, {});
      return successResponse({
        plane: "tenant",
        host,
        tenant: { id: store.tenant.id, slug: store.tenant.slug, name: store.tenant.name },
        branding: settings
          ? {
            display_name: settings.displayName,
            logo_url: settings.logoUrl,
            primary_color: settings.primaryColor,
            title: settings.title,
            description: settings.description,
            og_image_url: settings.ogImageUrl,
          }
          : { display_name: store.tenant.name },
      });
    }
    const seo = await this.em.findOne(PlatformSeoSettings, {});
    return successResponse({
      plane: "platform",
      host,
      branding: {
        display_name: "Wufud",
        title: seo?.title ?? "Wufud | Pilgrimage Booking SaaS",
        description: seo?.description ?? "Agency ERP and booking for Hajj and Umrah.",
        og_image_url: seo?.ogImageUrl,
      },
    });
  }
}
