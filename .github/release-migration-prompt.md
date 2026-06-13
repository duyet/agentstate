## 🚚 Migration

> This release is a minor/major bump or includes a breaking change. Review your
> deployment before upgrading. Paste the prompt below into any AI assistant
> together with your current configuration to get a tailored, step-by-step
> upgrade plan.

### Paste this into any AI assistant to plan your upgrade

```text
You are helping me upgrade my "AgentState" deployment to the latest release.

Here is my current configuration (env vars / wrangler / docker-compose / build
scripts / CI):

<PASTE YOUR CONFIG AND THE RELEASE NOTES ABOVE HERE>

Using the release notes above (especially any "Breaking Changes"):
1. List every change I must make, in order, with the exact file to edit.
2. Rewrite any changed environment variables, config keys, or commands.
3. Flag anything in my config that no longer has an equivalent instead of
   silently dropping it.
4. Give me a short rollback plan in case the upgrade fails.

Output the migrated config plus a concise checklist of what changed.
```
