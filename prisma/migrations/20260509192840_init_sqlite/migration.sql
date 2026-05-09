-- CreateTable
CREATE TABLE "Override" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prayer" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "CalendarOverride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hijri_year" INTEGER NOT NULL,
    "hijri_month" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "is_manual_override" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpecialPrayer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "hijri_year" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "prayers" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QiyamConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hijri_year" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarOverride_hijri_year_hijri_month_key" ON "CalendarOverride"("hijri_year", "hijri_month");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialPrayer_hijri_year_type_key" ON "SpecialPrayer"("hijri_year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "QiyamConfig_hijri_year_key" ON "QiyamConfig"("hijri_year");
