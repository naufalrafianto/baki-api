import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export class PlanExerciseDto {
  @IsNumber()
  exerciseId: number;

  @IsNumber()
  sets: number;

  @IsNumber()
  reps: number;

  @IsNumber()
  order: number;
}

export class CreateDailyPlanDto {
  @IsDateString()
  notificationTime: string;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @ArrayMinSize(1)
  repeatDays: DayOfWeek[];

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanExerciseDto)
  @ArrayMinSize(1)
  exercises: PlanExerciseDto[];
}
