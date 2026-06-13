// Renders the GitHub Release body from CI-provided env vars. Dependency-free and
// deterministic so it is identical across every duyet repo that shares the
// standardized release pipeline (see clickhouse-monitoring for the reference).
//
// Inputs (all optional — empty sections are omitted):
//   AI_SUMMARY         markdown summary from the LLM tier (recap blockquote + grouped changelog)
//   AI_PROVIDER        which tier produced the summary (copilot | github-models | anyrouter)
//   RECAP_MD           deterministic "Release recap" stats block (scripts/release-recap.mjs)
//   RELEASE_TAG        e.g. v0.3.0
//   PREVIOUS_TAG       e.g. v0.2.7 (for the compare link)
//   GITHUB_REPOSITORY  owner/repo (provided by the runner)
//   GITHUB_SERVER_URL  https://github.com (provided by the runner)
//   GITHUB_SHA         build commit (provided by the runner)
//   DOCKER_IMAGE       e.g. ghcr.io/duyet/<repo> (enables the Docker section)
//   DOCKER_VERSION     image tag, e.g. 0.3.0 (defaults to RELEASE_TAG without the leading v)
//   DOCKER_EXTRA_IMAGE optional second image name

const env = (k) => (process.env[k] ?? '').trim()

const shortSha = env('GITHUB_SHA').slice(0, 7) || 'unknown'
const date = new Date().toISOString()
const releaseTag = env('RELEASE_TAG')
const previousTag = env('PREVIOUS_TAG')
const repo = env('GITHUB_REPOSITORY')
const server = env('GITHUB_SERVER_URL') || 'https://github.com'
const aiSummary = env('AI_SUMMARY')
const aiProvider = env('AI_PROVIDER')
const recap = env('RECAP_MD')
const dockerImage = env('DOCKER_IMAGE')
const dockerVersion = env('DOCKER_VERSION') || releaseTag.replace(/^v/, '')
const dockerExtraImage = env('DOCKER_EXTRA_IMAGE')

const sections = []

if (aiSummary) sections.push(aiSummary)
if (recap) sections.push(recap)

if (dockerImage && dockerVersion) {
  const lines = [
    '## 🐳 Docker image',
    '',
    `This release is published to the GitHub Container Registry as \`${dockerImage}:${dockerVersion}\`.`,
    '',
    '```bash',
    `docker pull ${dockerImage}:${dockerVersion}`,
  ]
  if (dockerExtraImage) lines.push(`docker pull ${dockerExtraImage}:${dockerVersion}`)
  lines.push('```', '', 'Pin it in your own `Dockerfile`:', '', '```dockerfile', `FROM ${dockerImage}:${dockerVersion}`, '```')
  sections.push(lines.join('\n'))
}

if (previousTag && releaseTag && repo) {
  sections.push(
    `## 🔁 Full changelog\n\n**Compare:** [\`${previousTag}...${releaseTag}\`](${server}/${repo}/compare/${previousTag}...${releaseTag})`,
  )
}

const providerNote = aiProvider ? ` · summary by \`${aiProvider}\`` : ''
sections.push(`> Built from commit \`${shortSha}\` on ${date}${providerNote}.`)

process.stdout.write(`${sections.join('\n\n')}\n`)
