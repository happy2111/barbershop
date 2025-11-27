import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: payload.sub },
    });

    if (!specialist) {
      throw new UnauthorizedException('Invalid token: specialist not found');
    }

    // возвращается объект, который будет доступен через @Request() req.user
    return { id: specialist.id, phone: specialist.phone, role: specialist.role };
  }
}
