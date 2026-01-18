import {Body, Controller, Get, Post, Req, Res, UseGuards} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import {JwtAuthGuard} from "./guards/jwt-auth.guard";
import {User} from "./types/AuthRequest";

interface JwtUser {
  id: number;
  role: 'ADMIN' | 'SPECIALIST';
  companyId: number | null;
  name: string | null;
  photo: string | null;
  phone: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(dto);
    res.cookie(
      'refreshToken',
      refreshToken,
      this.authService.getRefreshCookieOptions(),
    );

    res.cookie(
      'accessToken',
      accessToken,
      this.authService.getAccessCookieOptions(),
    );
    return { user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    const {
      accessToken,
      refreshToken: newRt,
      user,
    } = await this.authService.refresh(refreshToken);
    res.cookie(
      'refreshToken',
      newRt,
      this.authService.getRefreshCookieOptions(),
    );

    res.cookie(
      'accessToken',
      accessToken,
      this.authService.getAccessCookieOptions(),
    );
    return { user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    await this.authService.logout(refreshToken);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@User() user: JwtUser) {
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      companyId: user.companyId,
      photo: user.photo
    };
  }
}
