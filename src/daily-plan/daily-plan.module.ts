import { Module } from '@nestjs/common';
import { DailyPlanService } from './daily-plan.service';
import { DailyPlanController } from './daily-plan.controller';

@Module({
  providers: [DailyPlanService],
  controllers: [DailyPlanController],
})
export class DailyPlanModule {}
