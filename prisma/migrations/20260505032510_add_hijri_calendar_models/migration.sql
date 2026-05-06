-- CreateTable
CREATE TABLE `CalendarOverride` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hijri_year` INTEGER NOT NULL,
    `hijri_month` INTEGER NOT NULL,
    `length` INTEGER NOT NULL,
    `is_manual_override` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CalendarOverride_hijri_year_hijri_month_key`(`hijri_year`, `hijri_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialPrayer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `hijri_year` INTEGER NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `prayers` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SpecialPrayer_hijri_year_type_key`(`hijri_year`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
