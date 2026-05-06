-- CreateTable
CREATE TABLE `QiyamConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hijri_year` INTEGER NOT NULL,
    `start_time` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QiyamConfig_hijri_year_key`(`hijri_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
