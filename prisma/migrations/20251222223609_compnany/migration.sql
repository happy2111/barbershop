/*
  Warnings:

  - You are about to drop the column `client_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `service_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `specialist_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `specialist_id` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `service_id` on the `specialist_services` table. All the data in the column will be lost.
  - You are about to drop the column `specialist_id` on the `specialist_services` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `specialists` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,phone]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[specialistId,day_of_week]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `service_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[specialistId,serviceId]` on the table `specialist_services` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,phone]` on the table `specialists` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialistId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialistId` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `service_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceId` to the `specialist_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialistId` to the `specialist_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `specialists` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_client_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_service_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_specialist_id_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_specialist_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_category_id_fkey";

-- DropForeignKey
ALTER TABLE "specialist_services" DROP CONSTRAINT "specialist_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "specialist_services" DROP CONSTRAINT "specialist_services_specialist_id_fkey";

-- DropIndex
DROP INDEX "clients_phone_key";

-- DropIndex
DROP INDEX "schedules_specialist_id_day_of_week_key";

-- DropIndex
DROP INDEX "service_categories_name_key";

-- DropIndex
DROP INDEX "specialist_services_specialist_id_service_id_key";

-- DropIndex
DROP INDEX "specialists_phone_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "client_id",
DROP COLUMN "service_id",
DROP COLUMN "specialist_id",
ADD COLUMN     "clientId" INTEGER NOT NULL,
ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "serviceId" INTEGER NOT NULL,
ADD COLUMN     "specialistId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "specialist_id",
ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "specialistId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "category_id",
ADD COLUMN     "categoryId" INTEGER NOT NULL,
ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "specialist_services" DROP COLUMN "service_id",
DROP COLUMN "specialist_id",
ADD COLUMN     "serviceId" INTEGER NOT NULL,
ADD COLUMN     "specialistId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "specialists" DROP COLUMN "refresh_token",
ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "refreshToken" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyId_phone_key" ON "clients"("companyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_specialistId_day_of_week_key" ON "schedules"("specialistId", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_companyId_name_key" ON "service_categories"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_services_specialistId_serviceId_key" ON "specialist_services"("specialistId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "specialists_companyId_phone_key" ON "specialists"("companyId", "phone");

-- AddForeignKey
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
