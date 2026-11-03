-- CreateTable
CREATE TABLE `anniversary` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `date` CHAR(10) NOT NULL,
    `yearly` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `future_letter` (
    `id` VARCHAR(36) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `body` TEXT NOT NULL,
    `unlockDate` CHAR(10) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `future_letter_authorId_idx`(`authorId`),
    INDEX `future_letter_recipientId_unlockDate_idx`(`recipientId`, `unlockDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_photo` (
    `letterId` VARCHAR(36) NOT NULL,
    `photoId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `letter_photo_photoId_idx`(`photoId`),
    PRIMARY KEY (`letterId`, `photoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `future_letter` ADD CONSTRAINT `future_letter_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `future_letter` ADD CONSTRAINT `future_letter_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_photo` ADD CONSTRAINT `letter_photo_letterId_fkey` FOREIGN KEY (`letterId`) REFERENCES `future_letter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_photo` ADD CONSTRAINT `letter_photo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
