import { specialist } from '@prisma/client';

export type SafeSpecialist = Omit<
  specialist,
  'password' | 'refreshToken' | 'role'
>;
