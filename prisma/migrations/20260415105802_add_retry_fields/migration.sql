-- AlterTable
ALTER TABLE `WebhookEvent` ADD COLUMN `lastError` VARCHAR(191) NULL,
    ADD COLUMN `nextRetryAt` DATETIME(3) NULL;
