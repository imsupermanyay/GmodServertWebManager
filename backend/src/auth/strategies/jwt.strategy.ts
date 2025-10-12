import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.log(`JwtStrategy 初始化，使用 secret: ${secret.substring(0, 10)}...`);
  }

  async validate(payload: any) {
    this.logger.log(`验证 JWT payload: sub=${payload.sub}, username=${payload.username}, role=${payload.role}`);
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role
    };
  }
}
