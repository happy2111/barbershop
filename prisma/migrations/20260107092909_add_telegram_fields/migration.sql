/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "telegramFirstName" TEXT,
ADD COLUMN     "telegramId" BIGINT,
ADD COLUMN     "telegramLang" TEXT,
ADD COLUMN     "telegramLastName" TEXT,
ADD COLUMN     "telegramUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_telegramId_key" ON "clients"("telegramId");
