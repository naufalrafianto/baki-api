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
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { DailyPlanService } from './daily-plan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateDailyPlanDto } from './dto/daily-plan.dto';
import { ApiQuery } from '@nestjs/swagger';
import { GetDailyPlansQueryDto } from './dto/daily-plan-query.dto';

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

  @Get()
  @ApiQuery({ type: GetDailyPlansQueryDto })
  async findAll(
    @GetUser('id') userId: string,
    @Query() query: GetDailyPlansQueryDto,
  ) {
    return this.dailyPlanService.findAll(userId, query);
  }

  @Get('today')
  async getTodayPlan(
    @GetUser('id') userId: string,
    @Query('timezone') timezone: string = 'Asia/Jakarta',
  ) {
    const plan = await this.dailyPlanService.findTodayPlan(userId, timezone);
    return {
      success: true,
      data: plan,
    };
  }

  @Get(':id')
  findOne(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: number,
  ) {
    return this.dailyPlanService.findOne(userId, id);
  }

  @Get('schedule/upcoming')
  async findUpcoming(@GetUser('id') userId: string) {
    return this.dailyPlanService.findUpcoming(userId);
  }
}
