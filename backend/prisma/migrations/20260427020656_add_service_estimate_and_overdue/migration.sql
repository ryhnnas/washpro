-- AlterTable
ALTER TABLE `Service` ADD COLUMN `estimate_value` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `estimate_unit` ENUM('HOUR', 'DAY') NOT NULL DEFAULT 'HOUR',
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `estimated_completion_at` DATETIME(3) NULL,
    ADD COLUMN `is_overdue` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Service_business_id_is_active_idx` ON `Service`(`business_id`, `is_active`);

-- CreateIndex
CREATE INDEX `Transaction_business_id_is_overdue_idx` ON `Transaction`(`business_id`, `is_overdue`);
