// src/session/session.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Get,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  CompleteSetDto,
  RecordSessionDto,
  RecordSetDto,
  StartSetDto,
} from './dto/session.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('record')
  async recordSet(@GetUser('id') userId: string, @Body() dto: RecordSetDto) {
    const result = await this.sessionService.recordSet(userId, dto);
    return {
      success: true,
      data: result,
    };
  }

  // @Post('start')
  // async startSet(@GetUser('id') userId: string, @Body() dto: StartSetDto) {
  //   return {
  //     success: true,
  //     data: await this.sessionService.startSet(
  //       userId,
  //       dto.dailyPlanId,
  //       dto.exerciseId,
  //       dto.setNumber,
  //     ),
  //   };
  // }

  // @Post('/complete')
  // async completeSet(
  //   @GetUser('id') userId: string,
  //   @Body() dto: CompleteSetDto,
  // ) {
  //   return {
  //     success: true,
  //     data: await this.sessionService.completeSet(
  //       userId,
  //       dto.dailyPlanId,
  //       dto.exerciseId,
  //       dto.setNumber,
  //       dto.reps,
  //     ),
  //   };
  // }

  // @Post(':dailyPlanId/:exerciseId/complete')
  // async completeSession(
  //   @GetUser('id') userId: string,
  //   @Param('dailyPlanId', ParseIntPipe) dailyPlanId: number,
  //   @Param('exerciseId', ParseIntPipe) exerciseId: number,
  // ) {
  //   return this.sessionService.completeSession(userId, dailyPlanId, exerciseId);
  // }

  // @Get(':dailyPlanId/:exerciseId/progress')
  // async getCurrentSetProgress(
  //   @GetUser('id') userId: string,
  //   @Param('dailyPlanId', ParseIntPipe) dailyPlanId: number,
  //   @Param('exerciseId', ParseIntPipe) exerciseId: number,
  // ) {
  //   const progress = await this.sessionService.getCurrentSetProgress(
  //     userId,
  //     dailyPlanId,
  //     exerciseId,
  //   );
  //   return {
  //     success: true,
  //     data: progress,
  //   };
  // }
}
