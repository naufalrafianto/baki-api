import { IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class HistoryQueryDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
