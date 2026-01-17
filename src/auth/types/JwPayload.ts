import {Role} from "@prisma/client";

export interface JwtPayload {
  sub: number;
  phone: string;
  role: Role;
  companyId: number;
}
