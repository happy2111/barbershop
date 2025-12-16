/*
  Warnings:

  - A unique constraint covering the columns `[specialist_id,day_of_week]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "schedules_specialist_id_day_of_week_key" ON "schedules"("specialist_id", "day_of_week");
