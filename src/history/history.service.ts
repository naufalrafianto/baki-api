// src/history/history.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getSessionHistory(
    userId: string,
    filter: {
      date?: Date;
      exerciseId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const { date, exerciseId, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      status: 'completed',
      ...(date && {
        startTime: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      }),
      ...(exerciseId && { exerciseId }),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        include: {
          exercise: true,
          histories: {
            orderBy: {
              setNumber: 'asc',
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data: sessions.map((session) => ({
        id: session.id,
        exerciseName: session.exercise.name,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: Math.floor(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000,
        ),
        totalSets: session.totalSets,
        totalReps: session.totalReps,
        sets: session.histories.map((history) => ({
          setNumber: history.setNumber,
          reps: history.reps,
          duration: history.duration,
          metadata: history.metadata,
        })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getExerciseStats(userId: string, exerciseId?: number) {
    const where = {
      userId,
      status: 'completed',
      ...(exerciseId && { exerciseId }),
    };

    const exercises = await this.prisma.exercise.findMany({
      where: exerciseId ? { id: exerciseId } : undefined,
      select: {
        id: true,
        name: true,
        sessions: {
          where,
          select: {
            totalSets: true,
            totalReps: true,
            histories: {
              select: {
                duration: true,
                metadata: true,
              },
            },
          },
        },
      },
    });

    return exercises.map((exercise) => {
      const sessions = exercise.sessions;
      const totalSessions = sessions.length;
      const totalSets = sessions.reduce((sum, s) => sum + s.totalSets, 0);
      const totalReps = sessions.reduce((sum, s) => sum + s.totalReps, 0);
      const totalDuration = sessions.reduce(
        (sum, s) => sum + s.histories.reduce((d, h) => d + h.duration, 0),
        0,
      );

      return {
        exerciseId: exercise.id,
        name: exercise.name,
        stats: {
          totalSessions,
          totalSets,
          totalReps,
          totalDuration,
          averageRepsPerSession: totalSessions
            ? Math.round(totalReps / totalSessions)
            : 0,
          averageDurationPerSession: totalSessions
            ? Math.round(totalDuration / totalSessions)
            : 0,
        },
      };
    });
  }
}
