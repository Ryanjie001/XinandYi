-- CreateTable
CREATE TABLE `memory_comment` (
    `id` VARCHAR(36) NOT NULL,
    `memoryId` VARCHAR(64) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memory_comment_memoryId_createdAt_idx`(`memoryId`, `createdAt`),
    INDEX `memory_comment_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_reaction` (
    `memoryId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memory_reaction_userId_idx`(`userId`),
    PRIMARY KEY (`memoryId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_read` (
    `memoryId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memory_read_userId_idx`(`userId`),
    PRIMARY KEY (`memoryId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `album` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `album_item` (
    `id` VARCHAR(36) NOT NULL,
    `albumId` VARCHAR(36) NOT NULL,
    `image` VARCHAR(255) NOT NULL,
    `photoId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `album_item_photoId_idx`(`photoId`),
    UNIQUE INDEX `album_item_albumId_image_key`(`albumId`, `image`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mood_entry` (
    `id` VARCHAR(36) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `date` CHAR(10) NOT NULL,
    `mood` VARCHAR(20) NOT NULL,
    `note` VARCHAR(500) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mood_entry_date_idx`(`date`),
    UNIQUE INDEX `mood_entry_authorId_date_key`(`authorId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_draft` (
    `id` VARCHAR(36) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `draftKey` VARCHAR(64) NOT NULL,
    `title` VARCHAR(60) NOT NULL,
    `body` TEXT NOT NULL,
    `date` VARCHAR(10) NOT NULL,
    `images` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `memory_draft_authorId_draftKey_key`(`authorId`, `draftKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draft_photo` (
    `draftId` VARCHAR(36) NOT NULL,
    `photoId` VARCHAR(36) NOT NULL,

    INDEX `draft_photo_photoId_idx`(`photoId`),
    PRIMARY KEY (`draftId`, `photoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `memory_comment` ADD CONSTRAINT `memory_comment_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `memory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_comment` ADD CONSTRAINT `memory_comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_reaction` ADD CONSTRAINT `memory_reaction_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `memory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_reaction` ADD CONSTRAINT `memory_reaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `app_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_read` ADD CONSTRAINT `memory_read_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `memory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_read` ADD CONSTRAINT `memory_read_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `app_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `album_item` ADD CONSTRAINT `album_item_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `album_item` ADD CONSTRAINT `album_item_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mood_entry` ADD CONSTRAINT `mood_entry_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_draft` ADD CONSTRAINT `memory_draft_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_photo` ADD CONSTRAINT `draft_photo_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `memory_draft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_photo` ADD CONSTRAINT `draft_photo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
