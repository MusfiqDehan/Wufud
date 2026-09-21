import { BusinessInterceptor } from "./shared/interceptors/business.interceptor";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ALL_ENTITIES } from "./database/entities";
import { env } from "./shared/config/env";
import { SharedModule } from "./shared/shared.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { IdentityModule } from "./identity/identity.module";
import { AccessModule } from "./access/access.module";
import { PlatformModule } from "./platform/platform.module";
import { PaymentsModule } from "./payments/payments.module";
import { BookingModule } from "./booking/booking.module";
import { AccountsModule } from "./accounts/accounts.module";
import { JobsModule } from "./jobs/jobs.module";
import { MailModule } from "./mail/mail.module";
import { SuccessInterceptor } from "./shared/interceptors/success.interceptor";
import { GlobalExceptionFilter } from "./shared/filters/http-exception.filter";
import { JwtAuthGuard } from "./identity/jwt.guard";
import { RequireFeatureGuard } from "./access/require-feature.guard";
import { SchemaInterceptor } from "./tenancy/schema.interceptor";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 120 }] }),
    MikroOrmModule.forRoot({
      driver: PostgreSqlDriver,
      clientUrl: env.DATABASE_URL,
      entities: ALL_ENTITIES,
      schema: "public",
      allowGlobalContext: true,
      registerRequestContext: false,
      debug: env.NODE_ENV === "development",
    }),
    SharedModule,
    TenancyModule,
    IdentityModule,
    AccessModule,
    PlatformModule,
    PaymentsModule,
    MailModule,
    BookingModule,
    AccountsModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SchemaInterceptor },
    { provide: APP_INTERCEPTOR, useClass: BusinessInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RequireFeatureGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
