import { Module } from "@nestjs/common";
import { forwardRef } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PlatformModule } from "../platform/platform.module";

@Module({
  imports: [forwardRef(() => PlatformModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
