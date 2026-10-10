-- Record who rejected a payment separately from who approved it.
ALTER TABLE `SubscriptionPayment`
    ADD COLUMN `rejected_at` DATETIME(3) NULL,
    ADD COLUMN `rejected_by_id` VARCHAR(191) NULL;

-- Rejections previously stored the rejecting admin in approved_by_id. Move that value
-- to the new column so "approved by" is only ever set on APPROVED payments.
UPDATE `SubscriptionPayment`
SET `rejected_by_id` = `approved_by_id`,
    `rejected_at` = `updated_at`,
    `approved_by_id` = NULL
WHERE `status` = 'REJECTED' AND `approved_by_id` IS NOT NULL;
