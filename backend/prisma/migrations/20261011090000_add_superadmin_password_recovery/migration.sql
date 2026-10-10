ALTER TABLE `SuperAdmin` ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `SuperAdminPasswordResetOtp` (
    `id` VARCHAR(191) NOT NULL,
    `super_admin_id` VARCHAR(191) NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SuperAdminPasswordResetOtp_super_admin_id_expires_at_idx`(`super_admin_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SuperAdminPasswordResetOtp`
    ADD CONSTRAINT `SuperAdminPasswordResetOtp_super_admin_id_fkey`
    FOREIGN KEY (`super_admin_id`) REFERENCES `SuperAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
