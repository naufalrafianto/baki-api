import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';

@Module({
  providers: [UserRepository, UsersService],
  exports: [UserRepository],
})
export class UsersModule {}
