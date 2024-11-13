import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseResponse } from '../common/types/response.type';

@ApiTags('History')
@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get session history' })
  async getSessionHistory(
    @GetUser('id') userId: string,
    @Query('date') date?: string,
    @Query('exerciseId', ParseIntPipe) exerciseId?: number,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ): Promise<BaseResponse<any>> {
    const result = await this.historyService.getSessionHistory(userId, {
      date: date ? new Date(date) : undefined,
      exerciseId,
      page,
      limit,
    });

    return {
      success: true,
      data: result.data,
      meta: {
        pagination: result.pagination,
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get exercise statistics' })
  async getExerciseStats(
    @GetUser('id') userId: string,
    @Query('exerciseId', ParseIntPipe) exerciseId?: number,
  ): Promise<BaseResponse<any>> {
    const stats = await this.historyService.getExerciseStats(
      userId,
      exerciseId,
    );
    return {
      success: true,
      data: stats,
    };
  }
}
