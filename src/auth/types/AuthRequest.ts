import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {Role} from "@prisma/client";

interface AuthRequest extends Request {
  user?: {
    id: number;
    phone: string;
    role: Role;
    companyId: number;
    name: string;
    photo: string;
  };
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user;
  },
);

