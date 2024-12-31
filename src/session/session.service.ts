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

  private getSessionProgressKey(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
  ): string {
    return `session_progress:${userId}:${dailyPlanId}:${exerciseId}`;
  }

  private getExerciseProgressKey(
    userId: string,
    dailyPlanId: number,
    exerciseId: number,
  ): string {
    return `exercise_progress:${userId}:${dailyPlanId}:${exerciseId}`;
  }

  async recordSet(userId: string, dto: RecordSetDto) {
    try {
      // Get plan exercise and validate
      const planExercise = await this.prisma.planExercise.findFirst({
        where: {
          dailyPlanId: dto.dailyPlanId,
          exerciseId: dto.exerciseId,
          dailyPlan: {
            userId,
            isActive: true,
          },
        },
        include: {
          exercise: true,
          dailyPlan: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!planExercise) {
        throw new NotFoundException('Exercise not found in the daily plan');
      }

      if (planExercise.isCompleted) {
        throw new BadRequestException(
          'This exercise has already been completed',
        );
      }

      const now = new Date().toISOString();

      // Immediately mark the exercise as completed
      await this.prisma.planExercise.update({
        where: {
          id: planExercise.id,
        },
        data: {
          isCompleted: true,
        },
      });

      // Count completed exercises for plan progress
      const completedExercises = planExercise.dailyPlan.exercises.filter(
        (ex) => (ex.id === planExercise.id ? true : ex.isCompleted),
      ).length;

      return {
        exerciseId: planExercise.exerciseId,
        exerciseName: planExercise.exercise.name,
        totalSets: planExercise.sets,
        completedSets: [
          {
            completed: true,
            duration: dto.duration,
            completedAt: now,
          },
        ],
        remainingSets: 0,
        totalDuration: dto.duration,
        progress: 100,
        isCompleted: true,
        planProgress: {
          totalExercises: planExercise.dailyPlan.exercises.length,
          completedExercises: completedExercises,
        },
      };
    } catch (error) {
      console.error('Error recording set:', error);
      throw error;
    }
  }

  // async recordSet(userId: string, dto: RecordSetDto) {
  //   try {
  //     const key = this.getSessionProgressKey(
  //       userId,
  //       dto.dailyPlanId,
  //       dto.exerciseId,
  //     );
  //     const progressStr = await this.redis.get(key);
  //     const now = new Date().toISOString();

  //     // Get plan exercise and validate
  //     const planExercise = await this.prisma.planExercise.findFirst({
  //       where: {
  //         dailyPlanId: dto.dailyPlanId,
  //         exerciseId: dto.exerciseId,
  //         dailyPlan: {
  //           userId,
  //           isActive: true,
  //         },
  //       },
  //       include: {
  //         exercise: true,
  //         dailyPlan: {
  //           include: {
  //             exercises: true,
  //           },
  //         },
  //       },
  //     });

  //     if (!planExercise) {
  //       throw new NotFoundException('Exercise not found in the daily plan');
  //     }

  //     let progress = progressStr
  //       ? JSON.parse(progressStr)
  //       : {
  //           userId,
  //           exerciseId: dto.exerciseId,
  //           dailyPlanId: dto.dailyPlanId,
  //           startTime: now,
  //           completedSets: [],
  //         };

  //     // Validate set number
  //     if (
  //       progress.completedSets.some((set) => set.setNumber === dto.setNumber)
  //     ) {
  //       throw new BadRequestException(
  //         `Set ${dto.setNumber} has already been recorded`,
  //       );
  //     }

  //     // Add new set
  //     const newSet = {
  //       setNumber: dto.setNumber,
  //       duration: dto.duration,
  //       completedAt: now,
  //     };

  //     progress.completedSets.push(newSet);

  //     // Save to Redis
  //     await this.redis.set(
  //       key,
  //       JSON.stringify(progress),
  //       24 * 60 * 60, // 24 hours TTL
  //     );

  //     // Check if all sets for this exercise are completed
  //     if (progress.completedSets.length === planExercise.sets) {
  //       // Update exercise completion status
  //       await this.prisma.planExercise.update({
  //         where: {
  //           id: planExercise.id,
  //         },
  //         data: {
  //           isCompleted: true,
  //         },
  //       });

  //       // Clear Redis cache for this exercise as it's complete
  //       await this.redis.del(key);
  //     }

  //     // Return response with updated status
  //     return {
  //       exerciseId: planExercise.exerciseId,
  //       exerciseName: planExercise.exercise.name,
  //       totalSets: planExercise.sets,
  //       currentSet: dto.setNumber + 1,
  //       lastCompletedSet: newSet,
  //       completedSets: progress.completedSets,
  //       remainingSets: planExercise.sets - progress.completedSets.length,
  //       progress: (progress.completedSets.length / planExercise.sets) * 100,
  //       isCompleted: progress.completedSets.length === planExercise.sets,
  //       planProgress: {
  //         totalExercises: planExercise.dailyPlan.exercises.length,
  //         completedExercises: planExercise.dailyPlan.exercises.filter((ex) =>
  //           ex.id === planExercise.id
  //             ? progress.completedSets.length === planExercise.sets
  //             : ex.isCompleted,
  //         ).length,
  //       },
  //     };
  //   } catch (error) {
  //     console.error('Error recording set:', error);
  //     throw error;
  //   }
  // }

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

  // async completeSession(
  //   userId: string,
  //   dailyPlanId: number,
  //   exerciseId: number,
  // ) {
  //   const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
  //   const progressStr = await this.redis.get(key);

  //   if (!progressStr) {
  //     throw new BadRequestException('No active session found');
  //   }

  //   const progress: SessionProgress = JSON.parse(progressStr);

  //   // Create session record
  //   const session = await this.recordSession(userId, {
  //     dailyPlanId,
  //     exerciseId,
  //     startTime: new Date(progress.startTime),
  //     endTime: new Date(),
  //     sets: progress.completedSets.map((set) => ({
  //       setNumber: set.setNumber,
  //       reps: set.reps,
  //       duration: set.duration,
  //     })),
  //   });

  //   // Clear Redis cache
  //   await this.redis.del(key);

  //   return session;
  // }

  // async startSet(
  //   userId: string,
  //   dailyPlanId: number,
  //   exerciseId: number,
  //   setNumber: number,
  // ) {
  //   try {
  //     const key = this.getSessionProgressKey(userId, dailyPlanId, exerciseId);
  //     const progressStr = await this.redis.get(key);
  //     let progress: SessionProgress;

  //     if (progressStr) {
  //       progress = JSON.parse(progressStr);
  //       // Check if this set is already completed
  //       if (progress.completedSets.some((set) => set.setNumber === setNumber)) {
  //         throw new BadRequestException(
  //           `Set ${setNumber} has already been completed`,
  //         );
  //       }
  //       // Check if there's an ongoing set
  //       if (
  //         progress.completedSets.some((set) => set.startTime && !set.endTime)
  //       ) {
  //         throw new BadRequestException('There is already an ongoing set');
  //       }
  //     } else {
  //       // Validate exercise exists in plan
  //       const planExercise = await this.prisma.planExercise.findFirst({
  //         where: {
  //           dailyPlanId,
  //           exerciseId,
  //           dailyPlan: {
  //             userId,
  //             isActive: true,
  //           },
  //         },
  //       });

  //       if (!planExercise) {
  //         throw new NotFoundException('Exercise not found in the daily plan');
  //       }

  //       progress = {
  //         userId,
  //         exerciseId,
  //         dailyPlanId,
  //         startTime: new Date().toISOString(),
  //         completedSets: [],
  //       };
  //     }

  //     // Add new set with start time
  //     const newSet: SetProgress = {
  //       setNumber,
  //       reps: 0, // Will be updated when the set is completed
  //       startTime: new Date().toISOString(),
  //       completedAt: new Date().toISOString(),
  //     };

  //     progress.completedSets.push(newSet);

  //     // Save to Redis
  //     await this.redis.set(
  //       key,
  //       JSON.stringify(progress),
  //       24 * 60 * 60, // 24 hours TTL
  //     );

  //     return {
  //       setNumber,
  //       startTime: newSet.startTime,
  //     };
  //   } catch (error) {
  //     console.error('Error starting set:', error);
  //     throw error;
  //   }
  // }

  // async completeSet(
  //   userId: string,
  //   dailyPlanId: number,
  //   exerciseId: number,
  //   setNumber: number,
  //   duration: number,
  // ) {
  //   try {
  //     const key = `session:${userId}:${dailyPlanId}:${exerciseId}`;

  //     // Check if the exercise exists in the daily plan
  //     const planExercise = await this.prisma.planExercise.findFirst({
  //       where: {
  //         dailyPlanId,
  //         exerciseId,
  //         dailyPlan: {
  //           userId,
  //         },
  //       },
  //     });
  //     if (!planExercise) {
  //       throw new NotFoundException('Exercise not found in the daily plan');
  //     }

  //     if (!planExercise) {
  //       throw new NotFoundException('Exercise not found in the daily plan');
  //     }

  //     // Check if there's an ongoing set
  //     const sessionData = await this.redis.get(key);
  //     if (sessionData) {
  //       const session = JSON.parse(sessionData);
  //       if (
  //         session.completedSets.some(
  //           (set) => set.setNumber === setNumber && !set.endTime,
  //         )
  //       ) {
  //         throw new BadRequestException(
  //           `Set ${setNumber} is already in progress`,
  //         );
  //       }
  //     }

  //     // Add the completed set to the session
  //     const completedSet = {
  //       setNumber,
  //       duration,
  //       completedAt: new Date().toISOString(),
  //     };

  //     // Save the updated session to Redis
  //     await this.redis.set(
  //       key,
  //       JSON.stringify({
  //         completedSets: [
  //           ...(sessionData ? JSON.parse(sessionData).completedSets : []),
  //           completedSet,
  //         ],
  //       }),
  //       24 * 60 * 60, // 24 hours expired
  //     );

  //     return {
  //       dailyPlanId,
  //       exerciseId,
  //       setNumber,
  //       duration,
  //     };
  //   } catch (error) {
  //     console.error('Error completing set:', error);
  //     throw error;
  //   }
  // }
}
