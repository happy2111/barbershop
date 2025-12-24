import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/JwPayload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const specialist = await this.prisma.specialist.findUnique({
      where: {
        companyId_phone: {
          companyId: payload.companyId,
          phone: payload.phone,
        },
      },
    });

    if (!specialist) {
      throw new UnauthorizedException('Invalid token: specialist not found');
    }

    return {
      id: specialist.id,
      phone: specialist.phone,
      role: specialist.role,
      companyId: specialist.companyId,
    };
  }
}
