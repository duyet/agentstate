# Security Policy

## Supported Versions

AgentState is currently pre-1.0. Only the latest version published on the `main` branch receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x (latest on `main`) | Yes |
| Older snapshots | No |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

### Primary channel

Use GitHub's private vulnerability reporting: go to the repository's **Security** tab → **Advisories** → **Report a vulnerability**. This keeps the disclosure confidential while we investigate.

### Fallback

If you cannot use GitHub's advisory flow, email **me@duyet.net** with the subject line `[SECURITY] AgentState – <brief description>`.

### What to expect

- **Acknowledgement**: within 3 business days of receiving your report.
- **Status updates**: we will keep you informed as we assess severity, develop a fix, and coordinate a release.
- **Disclosure timeline**: we aim to ship a fix within 30 days of a confirmed vulnerability. For critical issues we move faster; for complex ones we will agree a timeline with you.

## What to include in your report

A useful report contains:

1. A clear description of the vulnerability and its impact.
2. Affected endpoint(s), component(s), or version.
3. Step-by-step reproduction instructions.
4. Any proof-of-concept code or request/response samples (redact real API keys).
5. Your assessment of severity (CVSS score or informal rating is helpful but not required).

## Scope

**In scope**

- The REST API (`/api/v1/*`, `/api/v2/*`)
- The dashboard (authentication flows, data exposure, XSS)
- The TypeScript and Python SDKs
- The self-hosted deployment path (Cloudflare Worker + D1)
- Authentication and authorization logic

**Out of scope**

- Volumetric denial-of-service attacks (rate limiting is a Cloudflare platform concern)
- Social engineering of maintainers or users
- Automated scanner output submitted without a working proof-of-concept
- Vulnerabilities in third-party services (Cloudflare, Clerk) that are not specific to AgentState
- Issues in outdated or unsupported versions

## Our security practices

These are the controls currently in place:

- **Hashed API keys** — only SHA-256 hashes of API keys are stored; the raw key is never persisted after issuance.
- **Scoped, revocable capability tokens** — capability tokens (`as_cap_...`) carry explicit permission scopes (`state:read`, `state:write`, `state:watch`, `lease:write`, `claim:write`) and can be revoked at any time.
- **Non-leaky error responses** — error responses follow the format `{ "error": { "code", "message" } }` and never expose stack traces or internal implementation details.
- **Constant-time-floor authentication** — auth failures are artificially delayed to a minimum floor (~300 ms) to resist timing-based enumeration attacks.
- **Least-privilege design** — every component is granted only the access it needs; the API worker does not have write access to production secrets at runtime.

## Coordinated disclosure

We follow coordinated (responsible) disclosure. We ask that you give us a reasonable window to release a fix before publishing details publicly. In return, we will:

- Credit you by name (or alias) in the release notes and advisory, if you wish.
- Work transparently with you on the disclosure timeline.
- Not pursue legal action against researchers acting in good faith under this policy.

Thank you for helping keep AgentState and its users safe.
