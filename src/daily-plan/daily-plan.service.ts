import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyPlanDto } from './dto/daily-plan.dto';
import {
  getDayOfWeek,
  getDayOfWeekWithTimezone,
} from '../common/utils/date.util';
import { GetDailyPlansQueryDto } from './dto/daily-plan-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DailyPlanService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateDailyPlanDto) {
    try {
      return await this.prisma.dailyPlan.create({
        data: {
          userId,
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
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
    } catch (error) {
      // Log the error for debugging
      console.error('Error creating daily plan:', error);
      throw error;
    }
  }
  async findUserActivePlans(userId: string) {
    const plans = await this.prisma.dailyPlan.findMany({
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

    // Calculate completion status for each plan
    return plans.map((plan) => ({
      ...plan,
      totalExercises: plan.exercises.length,
      completedExercises: plan.exercises.filter((ex) => ex.isCompleted).length,
      isCompleted:
        plan.exercises.length > 0 &&
        plan.exercises.every((ex) => ex.isCompleted),
      progress:
        plan.exercises.length > 0
          ? (plan.exercises.filter((ex) => ex.isCompleted).length /
              plan.exercises.length) *
            100
          : 0,
      exercises: plan.exercises.map((exercise) => ({
        ...exercise,
        isCompleted: exercise.isCompleted,
        exercise: {
          ...exercise.exercise,
        },
      })),
    }));
  }

  async findTodayPlan(userId: string, timezone: string = 'Asia/Jakarta') {
    // Get current date in user's timezone
    const today = new Date();
    const dayOfWeek = getDayOfWeekWithTimezone(today, timezone);

    // Get the start and end of day in user's timezone
    const userDate = new Date(
      today.toLocaleString('en-US', { timeZone: timezone }),
    );
    const startOfDay = new Date(userDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(userDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert back to UTC for database query
    const plans = await this.prisma.dailyPlan.findMany({
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

    // Add completion status and progress to each plan
    return plans.map((plan) => ({
      ...plan,
      totalExercises: plan.exercises.length,
      completedExercises: plan.exercises.filter((ex) => ex.isCompleted).length,
      isCompleted:
        plan.exercises.length > 0 &&
        plan.exercises.every((ex) => ex.isCompleted),
      progress:
        plan.exercises.length > 0
          ? (plan.exercises.filter((ex) => ex.isCompleted).length /
              plan.exercises.length) *
            100
          : 0,
      exercises: plan.exercises.map((exercise) => ({
        ...exercise,
        isCompleted: exercise.isCompleted,
        remainingSets: exercise.isCompleted ? 0 : exercise.sets,
        exercise: {
          ...exercise.exercise,
        },
      })),
    }));
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
  async findAll(userId: string, query: GetDailyPlansQueryDto) {
    const {
      page = 1,
      limit = 10,
      searchTerm,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.DailyPlanWhereInput = {
      userId,
      ...(isActive !== undefined && { isActive }),
      ...(searchTerm && {
        OR: [
          { label: { contains: searchTerm, mode: 'insensitive' } },
          {
            exercises: {
              some: {
                exercise: {
                  name: { contains: searchTerm, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      }),
    };

    // Execute count and findMany in parallel
    const [total, dailyPlans] = await Promise.all([
      this.prisma.dailyPlan.count({ where }),
      this.prisma.dailyPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
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
      }),
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: dailyPlans,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async findOne(userId: string, id: number) {
    const dailyPlan = await this.prisma.dailyPlan.findFirst({
      where: {
        id,
        userId,
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

    if (!dailyPlan) {
      throw new NotFoundException(`Daily plan with ID ${id} not found`);
    }

    return dailyPlan;
  }

  async findUpcoming(userId: string) {
    const today = new Date();
    const dayOfWeek = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ][today.getDay()];

    return this.prisma.dailyPlan.findMany({
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
}
