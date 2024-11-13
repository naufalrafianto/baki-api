import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  notificationTime: Date;

  @IsArray()
  @IsString({ each: true })
  repeatDays: string[];

  @IsString()
  @IsOptional()
  label?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanExerciseDto)
  exercises: PlanExerciseDto[];
}
