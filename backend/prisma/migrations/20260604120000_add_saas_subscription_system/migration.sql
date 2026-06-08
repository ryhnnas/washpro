-- SaaS subscription tables & schema gaps that were previously applied via db push only.
-- Required before 20260605100000_add_email_verification_and_staff_flags (ALTER SubscriptionPayment).

-- CreateTable
CREATE TABLE `SuperAdmin` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SuperAdmin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `duration_days` INTEGER NOT NULL DEFAULT 30,
    `features` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `plan_id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `proof_of_payment` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'QRIS_DANA',
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `rejection_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `SubscriptionPayment_business_id_status_idx`(`business_id`, `status`),
    INDEX `SubscriptionPayment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Business`
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    ADD COLUMN `subscription_status` ENUM('TRIAL', 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'SUSPENDED') NOT NULL DEFAULT 'TRIAL',
    ADD COLUMN `trial_end_at` DATETIME(3) NULL,
    ADD COLUMN `subscription_end_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    ADD COLUMN `reset_password_token` VARCHAR(191) NULL,
    ADD COLUMN `reset_password_expires` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Customer`
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `Transaction`
    ADD COLUMN `line_items` JSON NULL,
    ADD COLUMN `created_by_user_id` VARCHAR(191) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- AlterTable: migrate BusinessSetting to current staff-permission + WA template columns
ALTER TABLE `BusinessSetting`
    DROP COLUMN `staffAllowedMenus`,
    DROP COLUMN `whatsapp_api_url`,
    DROP COLUMN `whatsapp_enabled`,
    DROP COLUMN `whatsapp_password`,
    DROP COLUMN `whatsapp_username`,
    DROP COLUMN `whatsapp_sender_name`,
    ADD COLUMN `allow_staff_dashboard` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allow_staff_customers` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allow_staff_services` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `allow_staff_reports` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsapp_templates` TEXT NULL,
    ADD COLUMN `whatsapp_receipt_template` TEXT NULL,
    ADD COLUMN `whatsapp_notification_states` TEXT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `WhatsAppSession` (
    `business_id` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'disconnected',
    `connected_via` VARCHAR(191) NULL,
    `last_connected` DATETIME(3) NULL,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WhatsAppSession_business_id_key`(`business_id`),
    INDEX `WhatsAppSession_status_idx`(`status`),
    PRIMARY KEY (`business_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppQueue` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `customer_phone` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `WhatsAppQueue_business_id_status_idx`(`business_id`, `status`),
    INDEX `WhatsAppQueue_status_created_at_idx`(`status`, `created_at`),
    INDEX `WhatsAppQueue_business_id_status_attempts_idx`(`business_id`, `status`, `attempts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_reset_password_token_key` ON `User`(`reset_password_token`);

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppSession` ADD CONSTRAINT `WhatsAppSession_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppQueue` ADD CONSTRAINT `WhatsAppQueue_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: membership tables missing updated_at from schema
ALTER TABLE `MembershipPackageTemplate`
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `CustomerMembership`
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
