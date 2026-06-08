-- Kolom allow_staff_settings tidak pernah ditambahkan via migration historis pada fresh deploy.
-- Drop hanya jika kolom ada (upgrade dari schema lama / migrate dev).
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'BusinessSetting'
    AND COLUMN_NAME = 'allow_staff_settings'
);
SET @drop_sql = IF(
  @col_exists > 0,
  'ALTER TABLE `BusinessSetting` DROP COLUMN `allow_staff_settings`',
  'SELECT 1'
);
PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;
