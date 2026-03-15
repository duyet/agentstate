# AgentState — Maintenance & Development Plan

This file is the single source of truth for autonomous maintenance. Read by Claude on every `/loop` iteration.

## Phase 0 — Benchmark (EVERY iteration)

Run quality scorecard first. If any metric regresses, fix it before doing anything else.

```bash
bunx biome check packages/api/src/ 2>&1 | tail -1                           # lint
bunx tsc --noEmit -p packages/api/tsconfig.json 2>&1 | wc -l                # typecheck (0 = clean)
cd packages/api && bunx vitest run 2>&1 | grep -E 'passed|failed'           # tests
cd packages/dashboard && bun run build 2>&1 | grep -c 'prerendered'         # dashboard build
curl -s -o /dev/null -w '%{http_code}' https://agentstate.app/api           # live API (200)
curl -s -o /dev/null -w '%{time_total}' https://agentstate.app/api          # response time (<0.1s)
gh run list --repo duyet/agentstate --workflow CI --limit 1 --json conclusion -q '.[0].conclusion'  # CI
git status --short                                                           # clean tree
```

### Quality Targets
| Metric | Target |
|--------|--------|
| Lint errors | 0 |
| Type errors | 0 |
| Tests | 100% pass |
| Dashboard build | clean static export |
| API status | 200 |
| API latency | <100ms |
| CI | success |
| Working tree | clean |
| Dead code | 0 unused exports |
| Security | 0 hardcoded secrets |
| Docs | match actual code |

Save scores to memory after each run.

## Phase 1 — Health check (run directly)

```bash
bunx biome check packages/api/src/
bunx tsc --noEmit -p packages/api/tsconfig.json
cd packages/api && bunx vitest run
curl -s https://agentstate.app/api
gh run list --repo duyet/agentstate --workflow CI --limit 1
git status --short
```

If anything fails → fix immediately before Phase 2.

## Phase 2 — Spawn parallel agents (2-4 non-overlapping)

Pick scenarios from the tables below. Spawn agents that touch **different files**. Use `run_in_background: true`.

### Code Quality
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| Lint + format | junior | `packages/api/src/` | `bunx biome check --write` — fix all |
| Code review | code-reviewer | `packages/api/src/` (read) | Report bugs, security, quality issues |
| Refactor | senior | `packages/api/src/` | Simplify, extract patterns, reduce LOC |
| Dead code | junior | all | Find/remove unused exports, imports, files |
| Type safety | senior | `packages/api/src/` | Fix `any`, add return types, strict nulls |

### Testing
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| Run tests | junior | `packages/api/test/` | Run vitest, fix failures |
| Add coverage | senior | `packages/api/test/` | Tests for untested endpoints, edge cases |
| E2E live test | senior | none (curl) | Create → append → list → delete on live API |
| Load test | senior | `scripts/` | Concurrent request script |

### Dashboard UI/UX
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| UI polish | senior | `packages/dashboard/src/` | Spacing, alignment, consistency |
| Theme check | junior | `packages/dashboard/src/` | Verify dark/light on all pages |
| Accessibility | senior | `packages/dashboard/src/` | Aria labels, keyboard nav, contrast |
| New page | senior | `packages/dashboard/src/` | Implement from backlog |
| Component audit | junior | `packages/dashboard/src/components/` | Remove unused, check imports |
| Mobile responsive | senior | `packages/dashboard/src/` | Test and fix all breakpoints |

### Deployment & Infrastructure
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| Deploy + verify | junior | none | Build → deploy → test all endpoints |
| CI fix | senior | `.github/` | Investigate and fix failures |
| Dep update | junior | `package.json` | Update minor/patch, check breaking |
| Security audit | code-reviewer | all (read) | XSS, injection, auth bypass, secrets |
| Performance | senior | `packages/api/src/` | N+1 queries, indexes, caching |
| Wrangler update | junior | `package.json` | Update wrangler, test deploy |

### Documentation
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| Docs sync | junior | `*.md`, `docs/` | Match README, CLAUDE.md, agents.md to code |
| API docs | senior | `docs/integration.md` | Update with new/changed endpoints |
| agents.md refresh | senior | `packages/api/src/content/` | Update guide, regenerate static.ts |
| Changelog | junior | none | Generate from git log |

### Feature Development
| Scenario | Agent | Files | What to do |
|----------|-------|-------|------------|
| Plan feature | Plan | none | Architecture for next backlog item |
| Implement | senior | varies | Build from plan, tests, docs |
| Wire dashboard | senior | `packages/dashboard/src/` | Connect UI to real API |
| SDK package | senior | `packages/sdk/` | npm/pip wrapper |

## Phase 3 — After agents finish

1. Review agent output
2. Run: lint → typecheck → test → build dashboard
3. Deploy: `cd packages/dashboard && bun run build && cd ../api && bunx wrangler deploy`
4. Commit + push with semantic message + co-authors
5. Verify: `curl -s https://agentstate.app/api`
6. Update memory: `~/.claude/projects/-Users-duet-project-agentdb/memory/`
7. Update PLAN.md backlog status

## Rules

- Spawn agents on **different files** — no conflicts
- Always lint + typecheck + test before committing
- Build dashboard before deploying
- Commit + push after every meaningful change
- Save progress to memory after each iteration
- One commit per logical change, not one giant commit
- Co-authors on every commit:
  ```
  Co-Authored-By: Duyet Le <me@duyet.net>
  Co-Authored-By: duyetbot <bot@duyet.net>
  ```

## Backlog (prioritized)

- [ ] 1. Project CRUD wired to real API (not local state)
- [ ] 2. API key creation/revocation in dashboard
- [ ] 3. Clerk organization management (create org, invite members)
- [ ] 4. Conversation browser in dashboard
- [ ] 5. npm SDK package (@agentstate/sdk)
- [ ] 6. Python SDK package (agentstate)
- [ ] 7. Rate limiting middleware
- [ ] 8. OpenAPI spec generation
- [ ] 9. Usage analytics dashboard
- [ ] 10. Webhook notifications on new conversations
- [ ] 11. Search conversations by content
- [ ] 12. Conversation tags/labels
- [ ] 13. Bulk delete conversations
- [ ] 14. API versioning strategy
- [ ] 15. Custom domain SSL verification page

## Completed

- [x] API Core (Hono + D1 + Drizzle + auth + CRUD)
- [x] AI Features (title generation, follow-ups)
- [x] Dashboard (Next.js + shadcn sidebar + Clerk)
- [x] Agent endpoints (/llms.txt, /agents.md)
- [x] CI/CD (GitHub Actions: lint → test → deploy)
- [x] Custom domain (agentstate.app)
- [x] Light/dark theme
- [x] Cloudflare-style color palette
- [x] SVG logo
- [x] Create project form with slug validation
- [x] Workers Observability
- [x] 42 passing tests
- [x] Biome linting
- [x] Single Worker deployment
