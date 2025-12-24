import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: number;
    phone: string;
    role: string;
    companyId: number;
  };
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user;
  },
);
