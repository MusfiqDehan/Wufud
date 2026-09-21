import { Module, forwardRef } from "@nestjs/common";
import { PlatformService } from "./platform.service";
import { PlatformController } from "./platform.controller";
import { OnboardingService } from "./onboarding.service";
import { OnboardingController } from "./onboarding.controller";
import { TenancyModule } from "../tenancy/tenancy.module";
import { IdentityModule } from "../identity/identity.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [TenancyModule, IdentityModule, forwardRef(() => PaymentsModule)],
  controllers: [PlatformController, OnboardingController],
  providers: [PlatformService, OnboardingService],
  exports: [PlatformService, OnboardingService],
})
export class PlatformModule {}
