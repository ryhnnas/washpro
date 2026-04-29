/*
  Warnings:

  - You are about to drop the column `whatsapp_token` on the `Business` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Business` DROP COLUMN `whatsapp_token`,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `BusinessSetting` ADD COLUMN `membership_gold_min` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `membership_silver_min` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `membership_vip_min` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `whatsapp_api_url` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsapp_password` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp_sender_name` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp_username` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `membership` ENUM('REGULAR', 'SILVER', 'GOLD', 'VIP') NOT NULL DEFAULT 'REGULAR',
    ADD COLUMN `total_spent` INTEGER NOT NULL DEFAULT 0;
