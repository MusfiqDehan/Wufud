import { PosController } from "./pos.controller";
import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AccountsController } from "./accounts.controller";
import { TenancyModule } from "../tenancy/tenancy.module";

@Module({
  imports: [TenancyModule],
  controllers: [AccountsController, PosController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
