// src/daily-plan/daily-plan.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DailyPlanService } from './daily-plan.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { User, Session, DailyPlan, SessionExercise } from '@prisma/client';

describe('DailyPlanService', () => {
  let service: DailyPlanService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dailyPlan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sessionExercise: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    exercise: {
      findUnique: jest.fn(),
    },
    history: {
      create: jest.fn(),
    },
    achievement: {
      create: jest.fn(),
    },
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    password: 'hashed-password',
    name: 'Test User',
    isActive: false,
    level: 1,
    experience: 0,
    startDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyPlanService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DailyPlanService>(DailyPlanService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startUserJourney', () => {
    it('should start user journey successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        dailyPlans: [],
      });

      mockPrismaService.user.update.mockResolvedValueOnce({
        ...mockUser,
        startDate: new Date(),
        isActive: true,
      });

      const result = await service.startUserJourney('user-1');

      expect(result).toHaveProperty('message', 'Journey started successfully');
      expect(result).toHaveProperty('startDate');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.startUserJourney('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if journey already started', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        startDate: new Date(),
      });

      await expect(service.startUserJourney('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createDailyPlan', () => {
    const mockCreatePlanDto = {
      date: new Date(),
      notificationTime: new Date(),
      repeatDays: ['MONDAY', 'WEDNESDAY'],
      exercises: [
        {
          exerciseId: 'exercise-1',
          sets: 3,
          repetitions: 12,
          label: 'Morning',
        },
      ],
    };

    it('should create daily plan successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        startDate: new Date(),
      });
      mockPrismaService.dailyPlan.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.exercise.findUnique.mockResolvedValueOnce({
        id: 'exercise-1',
      });

      const mockCreatedPlan = {
        id: 'plan-1',
        ...mockCreatePlanDto,
        exercises: [
          {
            id: 'daily-exercise-1',
            exerciseId: 'exercise-1',
            sets: 3,
            repetitions: 12,
            label: 'Morning',
            exercise: { id: 'exercise-1', name: 'Push-ups' },
          },
        ],
      };

      mockPrismaService.dailyPlan.create.mockResolvedValueOnce(mockCreatedPlan);

      const result = await service.createDailyPlan('user-1', mockCreatePlanDto);

      expect(result).toEqual(mockCreatedPlan);
    });

    it('should throw BadRequestException if journey not started', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        startDate: null,
      });

      await expect(
        service.createDailyPlan('user-1', mockCreatePlanDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if plan already exists for date', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        startDate: new Date(),
      });
      mockPrismaService.dailyPlan.findFirst.mockResolvedValueOnce({
        id: 'existing-plan',
      });

      await expect(
        service.createDailyPlan('user-1', mockCreatePlanDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startSession', () => {
    const mockPlan: DailyPlan & { exercises: any[] } = {
      id: 'plan-1',
      userId: 'user-1',
      date: new Date(),
      notificationTime: new Date(),
      isCompleted: false,
      repeatDays: ['MONDAY'],
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        {
          id: 'exercise-1',
          exerciseId: 'ex-1',
          sets: 3,
          repetitions: 12,
          order: 1,
          exercise: { id: 'ex-1', name: 'Push-ups' },
        },
      ],
    };

    it('should start session successfully', async () => {
      mockPrismaService.dailyPlan.findFirst.mockResolvedValueOnce(mockPlan);
      mockPrismaService.session.findFirst.mockResolvedValueOnce(null);

      const mockSession = {
        id: 'session-1',
        startTime: new Date(),
        exercises: [
          {
            id: 'session-exercise-1',
            order: 1,
            status: 'IN_PROGRESS',
            exercise: { id: 'ex-1', name: 'Push-ups' },
          },
        ],
      };

      mockPrismaService.session.create.mockResolvedValueOnce(mockSession);

      const result = await service.startSession('user-1', 'plan-1');

      expect(result).toHaveProperty('sessionId', 'session-1');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('currentExercise');
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.dailyPlan.findFirst.mockResolvedValueOnce(null);

      await expect(service.startSession('user-1', 'plan-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if active session exists', async () => {
      mockPrismaService.dailyPlan.findFirst.mockResolvedValueOnce(mockPlan);
      mockPrismaService.session.findFirst.mockResolvedValueOnce({
        id: 'active-session',
      });

      await expect(service.startSession('user-1', 'plan-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('completeExercise', () => {
    const mockExercise: Partial<SessionExercise> = {
      id: 'exercise-1',
      status: 'IN_PROGRESS',
      startTime: new Date(),
      order: 1,
      sets: 3,
      repetitions: 12,
      completed: 0,
    };

    it('should complete exercise and start next exercise', async () => {
      mockPrismaService.sessionExercise.findFirst.mockResolvedValueOnce({
        ...mockExercise,
        session: {
          exercises: [
            { ...mockExercise },
            { id: 'exercise-2', status: 'NOT_STARTED', order: 2 },
          ],
        },
      });

      mockPrismaService.sessionExercise.update.mockResolvedValueOnce({
        ...mockExercise,
        status: 'COMPLETED',
        endTime: expect.any(Date),
      });

      const result = await service.completeExercise(
        'user-1',
        'session-1',
        'exercise-1',
      );

      expect(result).toHaveProperty('completedExercise');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('nextExercise');
    });

    it('should throw NotFoundException if exercise not found', async () => {
      mockPrismaService.sessionExercise.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.completeExercise('user-1', 'session-1', 'exercise-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if exercise not in progress', async () => {
      mockPrismaService.sessionExercise.findFirst.mockResolvedValueOnce({
        ...mockExercise,
        status: 'COMPLETED',
      });

      await expect(
        service.completeExercise('user-1', 'session-1', 'exercise-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSessionDetails', () => {
    const mockSession = {
      id: 'session-1',
      startTime: new Date(),
      status: 'IN_PROGRESS',
      exercises: [
        {
          id: 'exercise-1',
          status: 'IN_PROGRESS',
          startTime: new Date(),
          sets: 3,
          repetitions: 12,
          completed: 6,
          order: 1,
          exercise: { id: 'ex-1', name: 'Push-ups' },
        },
      ],
    };

    it('should return session details successfully', async () => {
      mockPrismaService.session.findFirst.mockResolvedValueOnce(mockSession);

      const result = await service.getSessionDetails('user-1', 'session-1');

      expect(result).toHaveProperty('sessionId', 'session-1');
      expect(result).toHaveProperty('status', 'IN_PROGRESS');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('currentExercise');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.session.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getSessionDetails('user-1', 'session-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
