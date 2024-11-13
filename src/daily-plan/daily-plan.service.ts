import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyPlanDto } from './dto/daily-plan.dto';
import { getDayOfWeek } from '../common/utils/date.util';

@Injectable()
export class DailyPlanService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateDailyPlanDto) {
    return this.prisma.dailyPlan.create({
      data: {
        userId,
        notificationTime: dto.notificationTime,
        repeatDays: dto.repeatDays,
        label: dto.label,
        isActive: true,
        exercises: {
          create: dto.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            order: exercise.order,
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });
  }

  async findUserActivePlans(userId: string) {
    return this.prisma.dailyPlan.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTodayPlan(userId: string) {
    const dayOfWeek = getDayOfWeek(new Date());

    return this.prisma.dailyPlan.findFirst({
      where: {
        userId,
        isActive: true,
        repeatDays: {
          has: dayOfWeek,
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async deactivatePlan(id: number, userId: string) {
    const plan = await this.prisma.dailyPlan.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }

    return this.prisma.dailyPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
