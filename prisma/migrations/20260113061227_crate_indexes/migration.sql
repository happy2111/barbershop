-- CreateIndex
CREATE INDEX "bookings_specialistId_date_status_idx" ON "bookings"("specialistId", "date", "status");

-- CreateIndex
CREATE INDEX "bookings_companyId_date_idx" ON "bookings"("companyId", "date");

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "specialist_services_serviceId_idx" ON "specialist_services"("serviceId");

-- CreateIndex
CREATE INDEX "specialists_companyId_role_idx" ON "specialists"("companyId", "role");
