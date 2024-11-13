// src/session/dto/session.dto.ts
import {
  IsNumber,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SetDataDto {
  @IsNumber()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(1)
  reps: number;

  @IsNumber()
  @Min(0)
  duration: number; // in seconds
}

export class RecordSessionDto {
  @IsNumber()
  dailyPlanId: number;

  @IsNumber()
  exerciseId: number;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetDataDto)
  sets: SetDataDto[];
}
