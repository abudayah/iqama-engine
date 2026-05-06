-- CreateTable
CREATE TABLE `Override` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prayer` VARCHAR(191) NOT NULL,
    `overrideType` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
