// src/session/session.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordSessionDto } from './dto/session.dto';
import { getDayOfWeek } from '../common/utils/date.util';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async recordSession(userId: string, dto: RecordSessionDto) {
    try {
      // First verify if the exercise exists in the daily plan
      const planExercise = await this.prisma.planExercise.findFirst({
        where: {
          exerciseId: dto.exerciseId,
          dailyPlanId: dto.dailyPlanId,
          dailyPlan: {
            userId,
            isActive: true,
          },
        },
        include: {
          exercise: true,
          dailyPlan: true,
        },
      });

      if (!planExercise) {
        throw new BadRequestException(
          'Exercise not found in the specified daily plan',
        );
      }

      // Verify if the plan is for today
      const today = getDayOfWeek(new Date());
      if (!planExercise.dailyPlan.repeatDays.includes(today)) {
        throw new BadRequestException(
          'This exercise is not scheduled for today',
        );
      }

      // Verify if exercise is already completed
      if (planExercise.isCompleted) {
        throw new BadRequestException(
          'This exercise is already completed for today',
        );
      }

      // Verify sets and reps match the plan
      if (dto.sets.length !== planExercise.sets) {
        throw new BadRequestException(
          `Number of sets must match the plan (Expected: ${planExercise.sets}, Got: ${dto.sets.length})`,
        );
      }

      // Calculate totals
      const totalReps = dto.sets.reduce((sum, set) => sum + set.reps, 0);

      // Create session with daily plan reference
      const session = await this.prisma.session.create({
        data: {
          userId,
          exerciseId: dto.exerciseId,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          totalSets: dto.sets.length,
          totalReps: totalReps,
          status: 'completed',
          histories: {
            createMany: {
              data: dto.sets.map((set) => ({
                userId,
                setNumber: set.setNumber,
                reps: set.reps,
                duration: set.duration,
              })),
            },
          },
        },
        include: {
          exercise: true,
          histories: {
            orderBy: {
              setNumber: 'asc',
            },
          },
        },
      });

      // Mark the exercise as completed in the plan
      await this.prisma.planExercise.update({
        where: {
          id: planExercise.id,
        },
        data: {
          isCompleted: true,
        },
      });

      // Check if all exercises in the plan are completed
      const remainingExercises = await this.prisma.planExercise.count({
        where: {
          dailyPlanId: dto.dailyPlanId,
          isCompleted: false,
        },
      });

      // Update user experience
      await this.updateUserExperience(
        userId,
        planExercise.exercise.difficultyXP,
      );

      // Format response
      return {
        id: session.id,
        dailyPlanId: dto.dailyPlanId,
        exercise: {
          id: session.exercise.id,
          name: session.exercise.name,
        },
        startTime: session.startTime,
        endTime: session.endTime,
        totalSets: session.totalSets,
        totalReps: session.totalReps,
        duration: Math.floor(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000,
        ),
        sets: session.histories.map((history) => ({
          setNumber: history.setNumber,
          reps: history.reps,
          duration: history.duration,
        })),
        planProgress: {
          remainingExercises,
          isCompleted: remainingExercises === 0,
        },
      };
    } catch (error) {
      console.error('Session recording error:', error);
      throw error;
    }
  }

  private async updateUserExperience(userId: string, xp: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const newExperience = user.experience + xp;
    const levelUp = Math.floor(newExperience / (user.level * 100)) > 0;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        level: levelUp ? { increment: 1 } : undefined,
        experience: newExperience,
      },
    });
  }
}
