import { Module } from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { BookingModule } from "../booking/booking.module";
import { AccountsModule } from "../accounts/accounts.module";

@Module({
  imports: [BookingModule, AccountsModule],
  providers: [JobsService],
})
export class JobsModule {}
