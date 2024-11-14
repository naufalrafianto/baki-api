import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyPlanDto } from './dto/daily-plan.dto';
import { getDayOfWeek } from '../common/utils/date.util';
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
          notificationTime: new Date(dto.notificationTime),
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

    // Calculate pagination metadata
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
      orderBy: {
        notificationTime: 'asc',
      },
    });
  }
}
