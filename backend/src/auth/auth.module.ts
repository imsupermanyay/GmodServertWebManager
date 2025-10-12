import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { BasicAuthGuard } from './guards/basic-auth.guard';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [AuthService, BasicAuthGuard],
  exports: [AuthService, BasicAuthGuard],
})
export class AuthModule {}
