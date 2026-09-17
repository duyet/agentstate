CREATE TABLE `organization_identities` (
	`principal_kind` text NOT NULL,
	`clerk_subject` text NOT NULL,
	`organization_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "organization_identities_kind_check" CHECK("organization_identities"."principal_kind" IN ('user', 'organization'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_identities_principal_idx` ON `organization_identities` (`principal_kind`,`clerk_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_identities_organization_idx` ON `organization_identities` (`organization_id`);
--> statement-breakpoint
-- Bind only recognizable historical identities, preserving internal tenant IDs.
-- Shared default and unknown formats require verified operator recovery.
INSERT INTO organization_identities (principal_kind, clerk_subject, organization_id)
SELECT 'user', substr(clerk_org_id, 10), id FROM organizations
WHERE clerk_org_id GLOB 'personal:user_*'
  AND length(substr(clerk_org_id, 15)) > 0
  AND substr(clerk_org_id, 15) NOT GLOB '*[^A-Za-z0-9]*';
--> statement-breakpoint
INSERT INTO organization_identities (principal_kind, clerk_subject, organization_id)
SELECT 'organization', clerk_org_id, id FROM organizations
WHERE clerk_org_id GLOB 'org_*'
  AND length(substr(clerk_org_id, 5)) > 0
  AND substr(clerk_org_id, 5) NOT GLOB '*[^A-Za-z0-9]*';
