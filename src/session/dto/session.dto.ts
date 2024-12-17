// src/session/dto/session.dto.ts
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class SessionSetDto {
  @IsNumber()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(1)
  reps: number;

  @IsNumber()
  @Min(0)
  duration: number;
}

export class RecordSessionDto {
  @IsNumber()
  dailyPlanId: number;

  @IsNumber()
  exerciseId: number;

  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionSetDto)
  @ArrayMinSize(1)
  sets: SessionSetDto[];
}

export class RecordSetDto {
  @IsNumber()
  @Min(1)
  dailyPlanId: number;

  @IsNumber()
  @Min(1)
  exerciseId: number;

  @IsNumber()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(0)
  duration: number;
}

export class StartSetDto {
  @IsNumber()
  @Min(1)
  dailyPlanId: number;

  @IsNumber()
  @Min(1)
  exerciseId: number;

  @IsNumber()
  @Min(1)
  setNumber: number;
}

export class CompleteSetDto {
  @IsNumber()
  @Min(1)
  dailyPlanId: number;

  @IsNumber()
  @Min(1)
  exerciseId: number;

  @IsNumber()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(1)
  reps: number;
}
