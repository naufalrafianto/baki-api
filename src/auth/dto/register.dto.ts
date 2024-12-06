import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    minimum: 3,
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minimum: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
