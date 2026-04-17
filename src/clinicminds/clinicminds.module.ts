import { Module } from '@nestjs/common';
import { ClinicmindsService } from './clinicminds.service';

@Module({
  providers: [ClinicmindsService],
  exports: [ClinicmindsService],
})
export class ClinicmindsModule {}
