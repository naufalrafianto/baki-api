// src/session/session.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RecordSessionDto } from './dto/session.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordSession(
    @GetUser('id') userId: string,
    @Body() dto: RecordSessionDto,
  ) {
    try {
      const session = await this.sessionService.recordSession(userId, dto);
      return {
        success: true,
        data: session,
        message: 'Session recorded successfully',
      };
    } catch (error) {
      console.error('Error recording session:', error);
      if (error.status) {
        throw error; // Rethrow NestJS HTTP exceptions
      }
      throw new InternalServerErrorException('Failed to record session');
    }
  }
}
