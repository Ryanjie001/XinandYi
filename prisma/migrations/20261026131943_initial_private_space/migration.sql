-- CreateTable
CREATE TABLE `app_user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `person` VARCHAR(8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_user_email_key`(`email`),
    UNIQUE INDEX `app_user_person_key`(`person`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_session` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `auth_session_token_key`(`token`),
    INDEX `auth_session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_account_userId_idx`(`userId`),
    UNIQUE INDEX `auth_account_providerId_accountId_key`(`providerId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_rate_limit` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `lastRequest` BIGINT NOT NULL,

    UNIQUE INDEX `auth_rate_limit_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `couple_settings` (
    `id` VARCHAR(20) NOT NULL DEFAULT 'us',
    `startDate` VARCHAR(10) NOT NULL DEFAULT '',
    `xinBirthday` VARCHAR(10) NOT NULL DEFAULT '',
    `yiBirthday` VARCHAR(10) NOT NULL DEFAULT '',
    `coverImage` VARCHAR(255) NOT NULL DEFAULT '',
    `coverPhotoId` VARCHAR(36) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(60) NOT NULL,
    `body` TEXT NOT NULL,
    `date` CHAR(10) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `images` JSON NOT NULL,
    `demo` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 1,
    `wishId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `memory_wishId_key`(`wishId`),
    INDEX `memory_date_createdAt_idx`(`date`, `createdAt`),
    INDEX `memory_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wish` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `note` VARCHAR(1000) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `completedAt` CHAR(10) NULL,
    `demo` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wish_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo` (
    `id` VARCHAR(36) NOT NULL,
    `objectKey` VARCHAR(255) NOT NULL,
    `bucket` VARCHAR(100) NOT NULL,
    `region` VARCHAR(40) NOT NULL,
    `contentType` VARCHAR(40) NOT NULL,
    `bytes` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'ready',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `photo_objectKey_key`(`objectKey`),
    INDEX `photo_ownerId_status_idx`(`ownerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_photo` (
    `memoryId` VARCHAR(64) NOT NULL,
    `photoId` VARCHAR(36) NOT NULL,

    PRIMARY KEY (`memoryId`, `photoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_batch` (
    `id` VARCHAR(36) NOT NULL,
    `hash` VARCHAR(64) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `import_batch_hash_key`(`hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_session` ADD CONSTRAINT `auth_session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `app_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_account` ADD CONSTRAINT `auth_account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `app_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `couple_settings` ADD CONSTRAINT `couple_settings_coverPhotoId_fkey` FOREIGN KEY (`coverPhotoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory` ADD CONSTRAINT `memory_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory` ADD CONSTRAINT `memory_wishId_fkey` FOREIGN KEY (`wishId`) REFERENCES `wish`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wish` ADD CONSTRAINT `wish_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo` ADD CONSTRAINT `photo_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_photo` ADD CONSTRAINT `memory_photo_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `memory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_photo` ADD CONSTRAINT `memory_photo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_batch` ADD CONSTRAINT `import_batch_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
