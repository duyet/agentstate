ALTER TABLE `projects` ADD `retention_days` integer CHECK (`retention_days` IS NULL OR `retention_days` BETWEEN 1 AND 3650);
