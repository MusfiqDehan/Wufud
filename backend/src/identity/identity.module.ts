import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersController } from "./users.controller";
import { JwtAuthGuard } from "./jwt.guard";
import { TenancyModule } from "../tenancy/tenancy.module";
import { env } from "../shared/config/env";

@Module({
  imports: [TenancyModule, JwtModule.register({ secret: env.JWT_ACCESS_SECRET })],
  controllers: [AuthController, UsersController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class IdentityModule {}
