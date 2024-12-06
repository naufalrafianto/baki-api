import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordSessionDto, RecordSetDto } from './dto/session.dto';
import { getDayOfWeekWithTimezone } from '../common/utils/date.util';
import { SessionProgress, SetProgress } from './types/session.types';
import { REDIS_KEYS } from './constants/session.constants';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async recordSession(
    userId: string,
    dto: RecordSessionDto,
    timezone: string = 'Asia/Jakarta',
  ) {
    try {
      // First verify if the exercise exists in the daily plan
      const planExercise = await this.prisma.planExercise.findFirst({
        where: {
          exerciseId: Number(dto.exerciseId),
          dailyPlanId: Number(dto.dailyPlanId),
          dailyPlan: {
            userId,
            isActive: true,
          },
        },
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              difficultyXP: true,
            },
          },
          dailyPlan: {
            select: {
              id: true,
              repeatDays: true,
            },
          },
        },
      });

      if (!planExercise) {
        throw new BadRequestException(
          'Exercise not found in the specified daily plan',
        );
      }

      // Verify if the plan is for today using user's timezone
      const userDate = new Date(dto.startTime);
      const todayInUserTimezone = getDayOfWeekWithTimezone(userDate, timezone);

      if (!planExercise.dailyPlan.repeatDays.includes(todayInUserTimezone)) {
        throw new BadRequestException(
          `This exercise is not scheduled for ${todayInUserTimezone.toLowerCase()}`,
        );
      }

      // Get the start and end of day in user's timezone for completion check
      const startOfDay = new Date(
        userDate.toLocaleString('en-US', { timeZone: timezone }),
      );
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

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
          exerciseId: Number(dto.exerciseId),
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          totalSets: dto.sets.length,
          totalReps,
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
          exercise: {
            select: {
              id: true,
              name: true,
            },
          },
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
          dailyPlanId: Number(dto.dailyPlanId),
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
      select: {
        id: true,
        level: true,
        experience: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

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

  private getSessionProgressKey(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
  ): string {
    return `session_progress:${userId}:${dailyPlanId}:${exerciseId}`;
  }

  async getCurrentSetProgress(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
  ) {
    try {
      // Validate input
      if (!userId || !dailyPlanId || !exerciseId) {
        throw new BadRequestException('Invalid parameters provided');
      }

      const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
      const progressStr = await this.redis.get(key);

      // Find plan exercise first to validate existence
      const planExercise = await this.prisma.planExercise.findFirst({
        where: {
          dailyPlanId,
          exerciseId,
          dailyPlan: {
            userId,
            isActive: true,
          },
        },
        include: {
          exercise: true,
        },
      });

      if (!planExercise) {
        throw new NotFoundException('Exercise not found in the daily plan');
      }

      if (!progressStr) {
        // Return initial state
        return {
          exerciseId: planExercise.exerciseId,
          exerciseName: planExercise.exercise.name,
          totalSets: planExercise.sets,
          currentSet: 1,
          completedSets: [],
          remainingSets: planExercise.sets,
          progress: 0,
          startTime: null,
          elapsedTime: 0,
          averageSetDuration: 0,
        };
      }

      const progress: SessionProgress = JSON.parse(progressStr);
      const lastCompletedSet =
        progress.completedSets[progress.completedSets.length - 1];
      const currentSet = lastCompletedSet ? lastCompletedSet.setNumber + 1 : 1;

      return {
        exerciseId: planExercise.exerciseId,
        exerciseName: planExercise.exercise.name,
        totalSets: planExercise.sets,
        currentSet:
          currentSet > planExercise.sets ? planExercise.sets : currentSet,
        completedSets: progress.completedSets,
        remainingSets: planExercise.sets - progress.completedSets.length,
        progress: (progress.completedSets.length / planExercise.sets) * 100,
        startTime: progress.startTime,
        elapsedTime: progress.startTime
          ? Math.floor(
              (new Date().getTime() - new Date(progress.startTime).getTime()) /
                1000,
            )
          : 0,
        averageSetDuration:
          progress.completedSets.length > 0
            ? Math.floor(
                progress.completedSets.reduce(
                  (sum, set) => sum + set.duration,
                  0,
                ) / progress.completedSets.length,
              )
            : 0,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error getting set progress:', error);
      throw new BadRequestException('Error retrieving set progress');
    }
  }

  async completeSession(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
  ) {
    const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
    const progressStr = await this.redis.get(key);

    if (!progressStr) {
      throw new BadRequestException('No active session found');
    }

    const progress: SessionProgress = JSON.parse(progressStr);

    // Create session record
    const session = await this.recordSession(userId, {
      dailyPlanId,
      exerciseId,
      startTime: new Date(progress.startTime),
      endTime: new Date(),
      sets: progress.completedSets.map((set) => ({
        setNumber: set.setNumber,
        reps: set.reps,
        duration: set.duration,
      })),
    });

    // Clear Redis cache
    await this.redis.del(key);

    return session;
  }

  async startSet(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
    setNumber: number,
  ) {
    try {
      const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
      const progressStr = await this.redis.get(key);
      let progress: SessionProgress;

      if (progressStr) {
        progress = JSON.parse(progressStr);
        // Check if this set is already completed
        if (progress.completedSets.some((set) => set.setNumber === setNumber)) {
          throw new BadRequestException(
            `Set ${setNumber} has already been completed`,
          );
        }
        // Check if there's an ongoing set
        if (
          progress.completedSets.some((set) => set.startTime && !set.endTime)
        ) {
          throw new BadRequestException('There is already an ongoing set');
        }
      } else {
        // Validate exercise exists in plan
        const planExercise = await this.prisma.planExercise.findFirst({
          where: {
            dailyPlanId,
            exerciseId,
            dailyPlan: {
              userId,
              isActive: true,
            },
          },
        });

        if (!planExercise) {
          throw new NotFoundException('Exercise not found in the daily plan');
        }

        progress = {
          userId,
          exerciseId,
          dailyPlanId,
          startTime: new Date().toISOString(),
          completedSets: [],
        };
      }

      // Add new set with start time
      const newSet: SetProgress = {
        setNumber,
        reps: 0, // Will be updated when the set is completed
        startTime: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      progress.completedSets.push(newSet);

      // Save to Redis
      await this.redis.set(
        key,
        JSON.stringify(progress),
        24 * 60 * 60, // 24 hours TTL
      );

      return {
        setNumber,
        startTime: newSet.startTime,
      };
    } catch (error) {
      console.error('Error starting set:', error);
      throw error;
    }
  }

  async completeSet(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
    setNumber: number,
    reps: number,
  ) {
    try {
      const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
      const progressStr = await this.redis.get(key);

      if (!progressStr) {
        throw new BadRequestException('No active session found');
      }

      const progress: SessionProgress = JSON.parse(progressStr);
      const setIndex = progress.completedSets.findIndex(
        (set) => set.setNumber === setNumber,
      );

      if (setIndex === -1) {
        throw new BadRequestException(`Set ${setNumber} hasn't been started`);
      }

      const set = progress.completedSets[setIndex];
      if (set.endTime) {
        throw new BadRequestException(
          `Set ${setNumber} has already been completed`,
        );
      }

      // Update set with completion details
      const endTime = new Date().toISOString();
      const duration = Math.floor(
        (new Date(endTime).getTime() - new Date(set.startTime).getTime()) /
          1000,
      );

      progress.completedSets[setIndex] = {
        ...set,
        reps,
        endTime,
        duration,
        completedAt: endTime,
      };

      // Save updated progress
      await this.redis.set(key, JSON.stringify(progress), 24 * 60 * 60);

      return {
        setNumber,
        reps,
        duration,
        startTime: set.startTime,
        endTime,
      };
    } catch (error) {
      console.error('Error completing set:', error);
      throw error;
    }
  }
}
