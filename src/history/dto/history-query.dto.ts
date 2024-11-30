import {
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsDate,
  IsEnum,
  IsInt,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class HistoryQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exerciseId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

export enum SessionStatus {
  COMPLETED = 'completed',
  UNCOMPLETED = 'uncompleted',
  IN_PROGRESS = 'in_progress',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetHistoryQueryDto {
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @IsOptional()
  exerciseId?: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsString()
  @IsOptional()
  searchTerm?: string;
}
