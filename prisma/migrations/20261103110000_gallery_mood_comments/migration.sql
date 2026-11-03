CREATE TABLE `gallery_photo` (
  `photoId` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`photoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `mood_comment` (
  `id` VARCHAR(36) NOT NULL,
  `moodId` VARCHAR(36) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `mood_comment_moodId_createdAt_idx`(`moodId`, `createdAt`),
  INDEX `mood_comment_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `gallery_photo` ADD CONSTRAINT `gallery_photo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `mood_comment` ADD CONSTRAINT `mood_comment_moodId_fkey` FOREIGN KEY (`moodId`) REFERENCES `mood_entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `mood_comment` ADD CONSTRAINT `mood_comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `app_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
