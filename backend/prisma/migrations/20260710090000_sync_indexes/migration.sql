-- Idempotent index sync. Only CREATE/DROP INDEX; no table or column data is touched.
-- Some indexes declared in schema.prisma were never created by earlier migrations,
-- so each statement first checks information_schema to work on both fresh and db-pushed databases.

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_business_id_start_date_idx'), 'DO 0', 'CREATE INDEX `Transaction_business_id_start_date_idx` ON `Transaction`(`business_id`, `start_date`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_business_id_status_idx'), 'DO 0', 'CREATE INDEX `Transaction_business_id_status_idx` ON `Transaction`(`business_id`, `status`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_business_id_customer_phone_idx'), 'DO 0', 'CREATE INDEX `Transaction_business_id_customer_phone_idx` ON `Transaction`(`business_id`, `customer_phone`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_business_id_status_estimated_completion_at_idx'), 'DO 0', 'CREATE INDEX `Transaction_business_id_status_estimated_completion_at_idx` ON `Transaction`(`business_id`, `status`, `estimated_completion_at`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Customer' AND index_name = 'Customer_business_id_name_idx'), 'DO 0', 'CREATE INDEX `Customer_business_id_name_idx` ON `Customer`(`business_id`, `name`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'User' AND index_name = 'User_business_id_idx'), 'DO 0', 'CREATE INDEX `User_business_id_idx` ON `User`(`business_id`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'MembershipPackageTemplate' AND index_name = 'MembershipPackageTemplate_business_id_is_active_idx'), 'DO 0', 'CREATE INDEX `MembershipPackageTemplate_business_id_is_active_idx` ON `MembershipPackageTemplate`(`business_id`, `is_active`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'CustomerMembership' AND index_name = 'CustomerMembership_business_id_status_idx'), 'DO 0', 'CREATE INDEX `CustomerMembership_business_id_status_idx` ON `CustomerMembership`(`business_id`, `status`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'CustomerMembership' AND index_name = 'CustomerMembership_customer_id_status_idx'), 'DO 0', 'CREATE INDEX `CustomerMembership_customer_id_status_idx` ON `CustomerMembership`(`customer_id`, `status`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'CustomerMembership' AND index_name = 'CustomerMembership_business_id_customer_id_status_idx'), 'DO 0', 'CREATE INDEX `CustomerMembership_business_id_customer_id_status_idx` ON `CustomerMembership`(`business_id`, `customer_id`, `status`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'CustomerMembershipUsageLog' AND index_name = 'CustomerMembershipUsageLog_business_id_created_at_idx'), 'DO 0', 'CREATE INDEX `CustomerMembershipUsageLog_business_id_created_at_idx` ON `CustomerMembershipUsageLog`(`business_id`, `created_at`)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_business_id_is_overdue_idx'), 'DROP INDEX `Transaction_business_id_is_overdue_idx` ON `Transaction`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Transaction' AND index_name = 'Transaction_status_start_date_idx'), 'DROP INDEX `Transaction_status_start_date_idx` ON `Transaction`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Service' AND index_name = 'Service_business_id_idx'), 'DROP INDEX `Service_business_id_idx` ON `Service`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'WhatsAppQueue' AND index_name = 'WhatsAppQueue_business_id_status_idx'), 'DROP INDEX `WhatsAppQueue_business_id_status_idx` ON `WhatsAppQueue`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

