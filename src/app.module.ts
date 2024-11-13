import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
=======
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { ConfigModule } from '@nestjs/config';
import { DailyPlanModule } from './daily-plan/daily-plan.module';
import { ExerciseModule } from './exercise/exercise.module';
import { AchievementModule } from './achievement/achievement.module';
import { SessionModule } from './session/session.module';
import { HistoryModule } from './history/history.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    PrismaModule,
    UsersModule,
    HealthModule,
    RedisModule,
    DailyPlanModule,
    ExerciseModule,
    AchievementModule,
    SessionModule,
    HistoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
>>>>>>> bb45769 (feat: mvp api)
})
export class AppModule {}
