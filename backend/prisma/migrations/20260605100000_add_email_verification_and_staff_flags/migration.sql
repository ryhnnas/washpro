ALTER TABLE `User`
  ADD COLUMN `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;

UPDATE `User` SET `is_email_verified` = true;

ALTER TABLE `SubscriptionPayment`
  ADD COLUMN `uploaded_by_user_id` VARCHAR(191) NULL,
  ADD COLUMN `admin_email_notified_at` DATETIME(3) NULL;

CREATE TABLE `EmailVerificationOtp` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `otp` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `EmailVerificationOtp_user_id_expires_at_idx`(`user_id`, `expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `SubscriptionPayment_uploaded_by_user_id_idx` ON `SubscriptionPayment`(`uploaded_by_user_id`);

ALTER TABLE `EmailVerificationOtp`
  ADD CONSTRAINT `EmailVerificationOtp_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SubscriptionPayment`
  ADD CONSTRAINT `SubscriptionPayment_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
