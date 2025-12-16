import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: number;
  phone: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private parseDurationToMs(input: string | undefined, fallbackMs: number): number {
    const str = (input ?? '').trim();
    if (!str) return fallbackMs;
    const match = /^([0-9]+)\s*([smhd])$/.exec(str);
    if (!match) return fallbackMs;
    const value = Number(match[1]);
    const unit = match[2];
    const mul = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return value * mul;
  }

  private async signTokens(user: { id: number; phone: string; role: string }) {
    const accessExpiresInStr = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresInStr = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.parseDurationToMs(accessExpiresInStr, 15 * 60 * 1000) / 1000,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.parseDurationToMs(refreshExpiresInStr, 7 * 24 * 60 * 60 * 1000) / 1000,
    });

    return { accessToken, refreshToken };
  }

  private async setRefreshToken(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.specialist.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }

  async login(dto: LoginDto) {
    const specialist = await this.prisma.specialist.findUnique({ where: { phone: dto.phone } });
    if (!specialist) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, specialist.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = await this.signTokens({
      id: specialist.id,
      phone: specialist.phone,
      role: specialist.role,
    });

    await this.setRefreshToken(specialist.id, refreshToken);

    return { accessToken, refreshToken, user: { id: specialist.id, phone: specialist.phone, name: specialist.name, role: specialist.role } };
  }

  async refresh(oldRefreshToken: string | undefined) {
    if (!oldRefreshToken) throw new UnauthorizedException('No refresh token');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(oldRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, name: true, role: true, refreshToken: true }, // выбираем только нужное
    });

    if (!specialist || !specialist.refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const match = await bcrypt.compare(oldRefreshToken, specialist.refreshToken);
    if (!match) throw new UnauthorizedException('Refresh token mismatch');
    const { accessToken, refreshToken } = await this.signTokens({
      id: specialist.id,
      phone: specialist.phone,
      role: specialist.role,
    });
    await this.setRefreshToken(specialist.id, refreshToken);
    return {
      accessToken,
      refreshToken,
      user: {
        id: specialist.id,
        phone: specialist.phone,
        name: specialist.name,
        role: specialist.role,
      },
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return; // idempotent
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.prisma.specialist.update({ where: { id: payload.sub }, data: { refreshToken: null } });
    } catch {
      // ignore invalid token for logout to be idempotent
    }
  }

  getRefreshCookieOptions() {
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const maxAge = this.parseDurationToMs(refreshExpiresIn, 7 * 24 * 60 * 60 * 1000);
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    return {
      httpOnly: true as const,
      secure: isProd,
      sameSite: ('lax' as const),
      path: '/',
      maxAge,
    };
  }
}
