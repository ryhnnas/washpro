-- Align Transaction table with current application behavior:
-- - cancellation workflow stores audit fields
-- - pay-later workflow uses BAYAR_NANTI
-- - dashboard/reporting excludes CANCELLED transactions

ALTER TABLE `Transaction`
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `cancel_reason` TEXT NULL,
    ADD COLUMN `cancelled_by_id` VARCHAR(191) NULL;

ALTER TABLE `Transaction`
    MODIFY `status` ENUM('PENDING', 'PROSES', 'SELESAI', 'DIAMBIL', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    MODIFY `payment_method` ENUM('CASH', 'QRIS', 'BAYAR_NANTI') NOT NULL;
