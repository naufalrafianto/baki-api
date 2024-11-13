import { Test, TestingModule } from '@nestjs/testing';
import { DailyPlanController } from './daily-plan.controller';

describe('DailyPlanController', () => {
  let controller: DailyPlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyPlanController],
    }).compile();

    controller = module.get<DailyPlanController>(DailyPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
