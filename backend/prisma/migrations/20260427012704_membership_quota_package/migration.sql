◇ injected env (9) from ../.env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
-- AlterTable
ALTER TABLE `BusinessSetting` DROP COLUMN `membership_gold_min`,
    DROP COLUMN `membership_silver_min`,
    DROP COLUMN `membership_vip_min`,
    ADD COLUMN `membership_duration_days` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `membership_package_name` VARCHAR(191) NOT NULL DEFAULT 'Paket Membership';

-- AlterTable
ALTER TABLE `Customer` DROP COLUMN `membership`,
    DROP COLUMN `total_spent`;

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `covered_amount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `customer_membership_id` VARCHAR(191) NULL,
    ADD COLUMN `payable_amount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `MembershipPackageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `duration_days` INTEGER NOT NULL DEFAULT 30,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipPackageQuotaItem` (
    `id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `quota_amount` DOUBLE NOT NULL DEFAULT 0,
    `deduction_rate` DOUBLE NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MembershipPackageQuotaItem_template_id_service_id_key`(`template_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerMembership` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerMembershipQuotaBalance` (
    `id` VARCHAR(191) NOT NULL,
    `customer_membership_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `initial_qty` DOUBLE NOT NULL,
    `remaining_qty` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomerMembershipQuotaBalance_customer_membership_id_servic_key`(`customer_membership_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerMembershipUsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `customer_membership_id` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `used_qty` DOUBLE NOT NULL,
    `covered_amount` INTEGER NOT NULL,
    `payable_amount` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_customer_membership_id_fkey` FOREIGN KEY (`customer_membership_id`) REFERENCES `CustomerMembership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipPackageTemplate` ADD CONSTRAINT `MembershipPackageTemplate_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipPackageQuotaItem` ADD CONSTRAINT `MembershipPackageQuotaItem_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `MembershipPackageTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipPackageQuotaItem` ADD CONSTRAINT `MembershipPackageQuotaItem_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembership` ADD CONSTRAINT `CustomerMembership_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembership` ADD CONSTRAINT `CustomerMembership_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `MembershipPackageTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembershipQuotaBalance` ADD CONSTRAINT `CustomerMembershipQuotaBalance_customer_membership_id_fkey` FOREIGN KEY (`customer_membership_id`) REFERENCES `CustomerMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembershipQuotaBalance` ADD CONSTRAINT `CustomerMembershipQuotaBalance_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembershipUsageLog` ADD CONSTRAINT `CustomerMembershipUsageLog_customer_membership_id_fkey` FOREIGN KEY (`customer_membership_id`) REFERENCES `CustomerMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembershipUsageLog` ADD CONSTRAINT `CustomerMembershipUsageLog_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerMembershipUsageLog` ADD CONSTRAINT `CustomerMembershipUsageLog_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

