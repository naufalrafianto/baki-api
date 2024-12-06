import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: 'uuid-example' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 1 })
  level?: number;

  @ApiProperty({ example: 0 })
  experience?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startDate?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt?: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  user: UserDto;

  @ApiProperty({ example: 'jwt-token-example' })
  token: string;
}

export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: 'Error message here' })
  message?: string;
}
