-- CreateEnum
CREATE TYPE "Local" AS ENUM ('ru', 'uz');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "local" "Local" NOT NULL DEFAULT 'uz';
