# Organization identity and recovery

## Identity contract

Dashboard authentication resolves a verified Clerk principal once to a persisted
`organization_identities` binding. A principal is either a Clerk user (Personal)
or the active Clerk organization. The binding points to `organizations.id`, which
is the stable tenant ID used by project creation, reads, and authorization.
`organizations.clerk_org_id` remains a compatibility/display field, not an
independently re-derived authorization key.

The first authenticated request establishes a new principal's tenant, even when
it is a read. Creation is atomic and conflict-safe. Existing bindings are reused;
organization name sync cannot change identity. JWT organization claims are
normalized across Clerk versions; malformed or conflicting claims are rejected,
not interpreted as Personal.

Personal and team workspaces remain separate. The workspace selector always
includes **Personal** and never auto-activates a membership. Switching back to
Personal clears the Clerk active organization and restores access to the same
personal projects. Joining a team does not share personal projects with its
members. Identical project slugs in different workspaces are valid.

## Migration

The identity migration binds recognized `org_<alphanumeric>` and
`personal:user_<alphanumeric>` values to their **existing** internal organization
IDs. It does not move projects, rewrite keys, or delete rows. Descendant data and
API-key access remain unchanged.

Shared `default`, malformed values, and unknown historical formats have no
provable owner in the schema. They remain unbound. An exact legacy row encountered
without a binding causes `IDENTITY_CONFLICT`, rather than adopting it or returning
a newly created empty tenant. An unrecognized legacy row with a different value
cannot be attributed to a login automatically: deployment must include the audit
below. New identity conventions require an explicit migration, not a fallback
change in session verification.

## Deployment audit (read-only)

Run after applying migrations, before accepting the deployment as complete:

```sql
SELECT o.id, o.clerk_org_id, o.name, COUNT(p.id) AS project_count
FROM organizations o
LEFT JOIN organization_identities i ON i.organization_id = o.id
LEFT JOIN projects p ON p.org_id = o.id
WHERE i.organization_id IS NULL
GROUP BY o.id, o.clerk_org_id, o.name;
```

Every returned production row needs an operator disposition. Do not treat an
empty dashboard as evidence that data was deleted. Do not print query results
containing tenant information into public CI logs or issue comments.

## Operator-only recovery

There is intentionally no browser endpoint for claiming an unbound organization.
The historical shared `default` tenant may contain data from multiple people;
neither a current session, an organization name, nor membership proves ownership.

1. Back up the database and record the existing organization ID and project IDs.
2. Establish ownership independently using trustworthy historical records and
   Clerk administration. If ownership is mixed or cannot be proven, stop. A
   reviewed per-project recovery is necessary; never assign the shared row to the
   next person who signs in.
3. Audit both sides using the **verified** principal kind and Clerk subject:

   ```sql
   SELECT * FROM organization_identities
   WHERE organization_id = :existing_organization_id
      OR (principal_kind = :verified_kind AND clerk_subject = :verified_subject);
   ```

4. Only if the row is unbound **and** the destination principal is unbound, insert
   the explicitly reviewed mapping. Use bound SQL parameters with an operator
   database client; the names below are placeholders, not values to paste:

   ```sql
   INSERT INTO organization_identities
     (principal_kind, clerk_subject, organization_id)
   VALUES (:verified_kind, :verified_subject, :existing_organization_id);
   ```

   Unique constraints refuse competing principal/tenant mappings. Never use
   `REPLACE`, delete a conflicting binding, or overwrite a live destination. If
   the destination already has a tenant, stop for a separate reviewed merge that
   checks project slug collisions and retains data ownership. Re-running a repair
   should first confirm the exact mapping already exists, then make no change.
5. Re-run the audit. Verify project IDs and API-key behavior are unchanged, the
   verified owner can read the data, and an unrelated session cannot. Retain a
   private audit record of the approved mapping and verification.

For rollback, stop dashboard writes and restore the known-good backup or revert
only a newly inserted mapping after verifying it is still exactly the reviewed
mapping and no new activity depends on it. Do not delete organizations or project
children. Do not roll back application code to string-derived authorization
without checking every compatibility field against its binding first.
