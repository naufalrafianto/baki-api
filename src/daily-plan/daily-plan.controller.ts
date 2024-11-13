import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { DailyPlanService } from './daily-plan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateDailyPlanDto } from './dto/daily-plan.dto';

@Controller('daily-plans')
@UseGuards(JwtAuthGuard)
export class DailyPlanController {
  constructor(private readonly dailyPlanService: DailyPlanService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetUser('id') userId: string, @Body() dto: CreateDailyPlanDto) {
    const plan = await this.dailyPlanService.create(userId, dto);
    return {
      success: true,
      data: plan,
      message: 'Daily plan created successfully',
    };
  }

  @Get('today')
  async getTodayPlan(@GetUser('id') userId: string) {
    const plan = await this.dailyPlanService.findTodayPlan(userId);
    return {
      success: true,
      data: plan,
    };
  }
}
