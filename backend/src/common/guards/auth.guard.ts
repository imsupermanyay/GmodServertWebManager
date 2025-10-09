import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session || !session.user) {
      throw new UnauthorizedException('请先登录');
    }

    // 将用户信息附加到 request 对象
    request.user = session.user;
    return true;
  }
}
