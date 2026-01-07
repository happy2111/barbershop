/*
  Warnings:

  - A unique constraint covering the columns `[companyId,telegramId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "clients_companyId_telegramId_key" ON "clients"("companyId", "telegramId");
