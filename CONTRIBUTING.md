# Contributing to AgentState

Thank you for your interest in contributing to AgentState! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+ and Bun (package manager)
- Cloudflare account with Workers and D1 enabled

### Setup
1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Copy `.env.example` to `.env.local` and configure
4. Set up the local database:
   ```bash
   bunx wrangler d1 migrations apply agentstate-db --local
   bunx wrangler d1 execute agentstate-db --local --file=scripts/seed.sql
   ```

See [README.md](README.md) for detailed setup instructions.

## Development Workflow

### Branching
- Create a feature branch from `main`: `git checkout -b feature/your-feature`
- Use semantic branch names: `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`

### Commits
Follow semantic commit format with consistent scope:
- `feat:` new features
- `fix:` bug fixes
- `chore:` maintenance tasks
- `docs:` documentation changes
- `refactor:` code restructuring
- `test:` test additions/changes

Always include both co-authors:
```
Co-Authored-By: Duyet Le <me@duyet.net>
Co-Authored-By: duyetbot <bot@duyet.net>
```

### Development Commands
```bash
# API dev (port 8787)
cd packages/api && bunx wrangler dev

# Dashboard dev (port 3000)
cd packages/dashboard && bun run dev

# Database migrations
bunx drizzle-kit generate
bunx wrangler d1 migrations apply agentstate-db --local

# Lint and format
bunx biome check packages/api/src/
bunx biome check --write packages/api/src/

# Type check
bunx tsc --noEmit -p packages/api/tsconfig.json

# Run tests
cd packages/api && bunx vitest run
```

## Code Style

- **Linter/Formatter**: Biome (run `bunx biome check --write` before committing)
- **TypeScript**: Strict mode enabled
- **Conventions**:
  - IDs: nanoid (21 chars)
  - Timestamps: Unix milliseconds
  - API responses: snake_case field names
  - API keys: Format `as_live_` + 40 base62 chars

## Testing

- All new features must include tests
- Run test suite before committing: `bunx vitest run`
- Ensure type checking passes: `bunx tsc --noEmit`
- Local test API key: `as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab`

## Pull Requests

1. Keep PRs focused and atomic
2. Reference related issues in description
3. Ensure all checks pass (CI/CD, lint, typecheck, tests)
4. Request review from maintainers
5. Squash merge with semantic commit title

### PR Template
```markdown
## Summary
- Change 1
- Change 2

## Test Plan
- [ ] Tests pass locally
- [ ] Typecheck passes
- [ ] Linter passes

## Related Issues
Closes #123
```

## Questions?

Feel free to open an issue for discussion or reach out to the maintainers.
