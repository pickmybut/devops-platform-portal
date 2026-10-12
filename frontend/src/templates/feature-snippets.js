/**
 * Platform-aware CI/CD feature snippet generators.
 *
 * Called by each pipeline template to inject additional jobs/steps when the
 * user has selected Optional Additional Features (step 6 in the form).
 *
 * Features:
 *   mend-sast          — Mend SAST security scan job
 *   mend-sca           — Mend SCA dependency scan job
 *   gitlab-sast        — GitLab built-in SAST (GitLab only — include: template)
 *   dependency-scan    — Dependency vulnerability scan
 *   slack-notifications — Slack success/failure notification job
 *   unit-tests         — Enhanced coverage gate (minimum coverage threshold)
 *   docker             — Dockerfile lint (only when not already building Docker)
 *   readme             — File-only feature, no pipeline injection needed
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag parser — call this at the top of each generate() function
// ─────────────────────────────────────────────────────────────────────────────

export function parseFeatureFlags(features = []) {
  const has = (id) => Array.isArray(features) && features.includes(id);
  return {
    hasMendSast:      has('mend-sast'),
    hasMendSca:       has('mend-sca'),
    hasGitLabSast:    has('gitlab-sast'),
    hasDepScan:       has('dependency-scan'),
    hasSlack:         has('slack-notifications'),
    hasAiCodeReview:  has('ai-code-review'),
    hasReadme:        has('readme'),  // file-only, no pipeline injection
    hasAny:           features.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GITLAB CI  ──  .gitlab-ci.yml snippets
// ─────────────────────────────────────────────────────────────────────────────

/** Returns `include:` lines for GitLab's built-in templates. */
export function gitlabFeatureIncludes(flags) {
  const lines = [];
  if (flags.hasGitLabSast) lines.push('  - template: Security/SAST.gitlab-ci.yml');
  if (flags.hasDepScan)    lines.push('  - template: Security/Dependency-Scanning.gitlab-ci.yml');
  return lines.length
    ? `# ── Security template includes ─────────────────────────────────────────────\ninclude:\n${lines.join('\n')}\n`
    : '';
}

/** Returns security + quality job definitions to append after the test jobs. */
export function gitlabSecurityJobs(flags) {
  const jobs = [];

  if (flags.hasMendSast) {
    jobs.push(
`# ── Mend SAST ──────────────────────────────────────────────────────────────
# Required CI/CD variables: MEND_URL, MEND_USERKEY, MEND_EMAIL
mend-sast:
  stage: Test
  image: mendsecurity/mend-sast:latest
  variables:
    MEND_URL: $MEND_URL
    MEND_USERKEY: $MEND_USERKEY
    MEND_EMAIL: $MEND_EMAIL
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: on_success
    - if: '$CI_COMMIT_BRANCH'
      when: on_success
    - when: never
  script:
    - mend sast
  artifacts:
    reports:
      sast: gl-sast-report.json
    expire_in: 1 week
  allow_failure: true`
    );
  }

  if (flags.hasMendSca) {
    jobs.push(
`# ── Mend SCA ───────────────────────────────────────────────────────────────
# Required CI/CD variables: MEND_URL, MEND_USERKEY, MEND_EMAIL
mend-sca:
  stage: Test
  image: mendsecurity/mend-cli:latest
  variables:
    MEND_URL: $MEND_URL
    MEND_USERKEY: $MEND_USERKEY
    MEND_EMAIL: $MEND_EMAIL
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: on_success
    - if: '$CI_COMMIT_BRANCH'
      when: on_success
    - when: never
  script:
    - mend dep
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json
    expire_in: 1 week
  allow_failure: true`
    );
  }

  if (flags.hasDepScan) {
    // GitLab built-in Dependency Scanning is handled via include: at the top.
    // No additional job needed here — the template adds the jobs automatically.
  }

  return jobs.join('\n\n');
}

/** Returns Slack .post notification jobs. */
export function gitlabSlackJobs(flags, projectName) {
  if (!flags.hasSlack) return '';
  return `
# ── Slack Notifications ───────────────────────────────────────────────────────
# Required CI/CD variable: SLACK_WEBHOOK_URL (masked)
notify-success:
  stage: .post
  image: alpine:latest
  variables:
    GIT_STRATEGY: none
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - when: never
  script:
    - apk add --no-cache curl
    - |
      curl -fsS -X POST -H 'Content-type: application/json' \\
        --data "{\\"text\\":\\"✅ *${projectName}* pipeline passed on \`$CI_COMMIT_REF_NAME\` — <$CI_PIPELINE_URL|View>\\"}" \\
        $SLACK_WEBHOOK_URL

notify-failure:
  stage: .post
  image: alpine:latest
  variables:
    GIT_STRATEGY: none
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_failure
    - when: never
  script:
    - apk add --no-cache curl
    - |
      curl -fsS -X POST -H 'Content-type: application/json' \\
        --data "{\\"text\\":\\"❌ *${projectName}* pipeline failed on \`$CI_COMMIT_REF_NAME\` — <$CI_PIPELINE_URL|View>\\"}" \\
        $SLACK_WEBHOOK_URL`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB ACTIONS  ──  .github/workflows/ci.yml snippets
// ─────────────────────────────────────────────────────────────────────────────

/** Returns security/quality jobs to append to the jobs block. */
export function githubSecurityJobs(flags, codeqlLanguage = 'javascript') {
  const jobs = [];

  // GitLab SAST → GitHub equivalent is CodeQL
  if (flags.hasGitLabSast) {
    jobs.push(
`
  # ── CodeQL Analysis (GitHub SAST) ────────────────────────────────────────────
  # GitHub's built-in SAST — equivalent of GitLab's Security/SAST.gitlab-ci.yml
  # Requires GitHub Advanced Security (free for public repos)
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    permissions:
      actions: read
      contents: read
      security-events: write
    strategy:
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${codeqlLanguage}
          queries: security-extended

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: /language:${codeqlLanguage}`
    );
  }

  if (flags.hasMendSast) {
    jobs.push(
`
  # ── Mend SAST ────────────────────────────────────────────────────────────────
  # Required secrets: MEND_EMAIL, MEND_USER_KEY, MEND_URL
  mend-sast:
    name: Mend SAST Scan
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Run Mend SAST
        uses: mend-dev-actions/mend-sast-action@v1
        env:
          MEND_EMAIL: \${{ secrets.MEND_EMAIL }}
          MEND_USER_KEY: \${{ secrets.MEND_USER_KEY }}
          MEND_URL: \${{ secrets.MEND_URL }}
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: wss-generated-file.sarif`
    );
  }

  if (flags.hasMendSca) {
    jobs.push(
`
  # ── Mend SCA ─────────────────────────────────────────────────────────────────
  # Required secrets: MEND_EMAIL, MEND_USER_KEY, MEND_URL
  mend-sca:
    name: Mend SCA Dependency Scan
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run Mend SCA
        uses: mend-dev-actions/mend-sca-action@v1
        env:
          MEND_EMAIL: \${{ secrets.MEND_EMAIL }}
          MEND_USER_KEY: \${{ secrets.MEND_USER_KEY }}
          MEND_URL: \${{ secrets.MEND_URL }}`
    );
  }

  if (flags.hasDepScan) {
    jobs.push(
`
  # ── Dependency Review (PRs) ───────────────────────────────────────────────────
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          comment-summary-in-pr: always

  # ── Trivy Vulnerability Scan (push to main) ────────────────────────────────
  trivy-scan:
    name: Trivy Vulnerability Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy filesystem scan
        uses: aquasecurity/trivy-action@0.20.0
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif`
    );
  }

  return jobs.join('');
}

/** Returns the Slack notification job (appended last). */
export function githubSlackJob(flags, projectName) {
  if (!flags.hasSlack) return '';
  return `
  # ── Slack Notifications ───────────────────────────────────────────────────────
  # Required: SLACK_BOT_TOKEN secret, SLACK_CHANNEL_ID variable
  slack-notify:
    name: Slack Notification
    runs-on: ubuntu-latest
    if: always() && github.ref == 'refs/heads/main'
    needs:
      - deploy-production
    steps:
      - name: Notify success
        if: needs.deploy-production.result == 'success'
        uses: slackapi/slack-github-action@v1.27.0
        with:
          channel-id: \${{ vars.SLACK_CHANNEL_ID }}
          slack-message: "✅ *${projectName}* deployed to production — <\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}|View run>"
        env:
          SLACK_BOT_TOKEN: \${{ secrets.SLACK_BOT_TOKEN }}
      - name: Notify failure
        if: needs.deploy-production.result != 'success'
        uses: slackapi/slack-github-action@v1.27.0
        with:
          channel-id: \${{ vars.SLACK_CHANNEL_ID }}
          slack-message: "❌ *${projectName}* pipeline failed — <\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}|View run>"
        env:
          SLACK_BOT_TOKEN: \${{ secrets.SLACK_BOT_TOKEN }}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BITBUCKET PIPELINES  ──  bitbucket-pipelines.yml snippets
// ─────────────────────────────────────────────────────────────────────────────

/** Returns step anchor definitions for the `definitions: steps:` block. */
export function bitbucketSecurityStepDefs(flags) {
  const defs = [];

  if (flags.hasMendSast) {
    defs.push(
`
    - step: &mend-sast
        name: Mend SAST Security Scan
        image: mendsecurity/mend-sast:latest
        script:
          - mend sast
        artifacts:
          - gl-sast-report.json`
    );
  }

  if (flags.hasMendSca) {
    defs.push(
`
    - step: &mend-sca
        name: Mend SCA Dependency Scan
        image: mendsecurity/mend-cli:latest
        script:
          - mend dep
        artifacts:
          - gl-dependency-scanning-report.json`
    );
  }

  if (flags.hasDepScan) {
    defs.push(
`
    - step: &dependency-scan
        name: OWASP Dependency Check
        image: owasp/dependency-check:latest
        script:
          - /usr/share/dependency-check/bin/dependency-check.sh
              --scan . --format HTML --out dependency-check-report --project $BITBUCKET_REPO_SLUG
        artifacts:
          - dependency-check-report/**`
    );
  }

  if (flags.hasSlack) {
    defs.push(
`
    - step: &slack-notify
        name: Notify Slack
        image: alpine:latest
        script:
          - apk add --no-cache curl
          - |
            curl -fsS -X POST -H 'Content-type: application/json' \\
              --data "{\\"text\\":\\"✅ Pipeline passed for *$BITBUCKET_REPO_SLUG* on \`$BITBUCKET_BRANCH\`\\"}" \\
              $SLACK_WEBHOOK_URL`
    );
  }

  return defs.join('');
}

/** Steps to inject into the default (feature branch) pipeline — security/lint only. */
export function bitbucketDefaultFeatureSteps(flags) {
  const steps = [];
  if (flags.hasMendSast)    steps.push(`    - step: *mend-sast`);
  if (flags.hasMendSca)     steps.push(`    - step: *mend-sca`);
  if (flags.hasDepScan)     steps.push(`    - step: *dependency-scan`);
  return steps.join('\n');
}

/** Steps to inject into the branches: main pipeline (security first, Slack last). */
export function bitbucketMainFeatureSteps(flags) {
  const steps = [];
  if (flags.hasMendSast)    steps.push(`      - step: *mend-sast`);
  if (flags.hasMendSca)     steps.push(`      - step: *mend-sca`);
  if (flags.hasDepScan)     steps.push(`      - step: *dependency-scan`);
  return steps.join('\n');
}

export function bitbucketSlackMainStep(flags) {
  return flags.hasSlack ? `      - step: *slack-notify` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS CODEPIPELINE  ──  buildspec.yml snippets
// ─────────────────────────────────────────────────────────────────────────────

/** Returns build-phase commands to inject into buildspec.yml's build phase. */
export function codepipelineSecurityBuildCmds(flags) {
  const cmds = [];

  if (flags.hasMendSast) {
    cmds.push(
`      - echo "Running Mend SAST..."
      - mend sast || true`
    );
  }

  if (flags.hasMendSca) {
    cmds.push(
`      - echo "Running Mend SCA dependency scan..."
      - mend dep || true`
    );
  }

  if (flags.hasDepScan) {
    cmds.push(
`      - echo "Running OWASP Dependency Check..."
      - |
        if command -v dependency-check.sh &>/dev/null; then
          dependency-check.sh --scan . --format HTML --out dependency-check-report || true
        fi`
    );
  }

  return cmds.join('\n');
}

/** Returns post_build commands for Slack notification in buildspec. */
export function codepipelineSlackPostBuild(flags, projectName) {
  if (!flags.hasSlack) return '';
  return `
      - echo "Sending Slack notification..."
      - |
        if [ "$CODEBUILD_BUILD_SUCCEEDING" = "1" ]; then
          curl -fsS -X POST -H 'Content-type: application/json' \\
            --data "{\\"text\\":\\"✅ *${projectName}* pipeline passed on CodePipeline\\"}" \\
            $SLACK_WEBHOOK_URL || true
        else
          curl -fsS -X POST -H 'Content-type: application/json' \\
            --data "{\\"text\\":\\"❌ *${projectName}* pipeline failed on CodePipeline\\"}" \\
            $SLACK_WEBHOOK_URL || true
        fi`;
}

/** Returns a feature requirements comment block for the pipeline header. */
export function featureRequirementsComment(flags, platformId) {
  const reqs = [];

  if (flags.hasMendSast || flags.hasMendSca) {
    const varKey = platformId === 'gitlab' ? 'CI/CD Variables' :
                   platformId === 'github' ? 'Secrets' :
                   platformId === 'bitbucket' ? 'Repository Variables' : 'Environment Variables';
    reqs.push(`#   ${varKey}: MEND_URL, MEND_USERKEY / MEND_USER_KEY, MEND_EMAIL`);
  }
  if (flags.hasSlack) {
    const varKey = platformId === 'gitlab' ? 'CI/CD Variables' :
                   platformId === 'github' ? 'SLACK_BOT_TOKEN secret + SLACK_CHANNEL_ID variable' :
                   platformId === 'bitbucket' ? 'Repository Variables' : 'Environment Variables';
    reqs.push(`#   ${varKey}: SLACK_WEBHOOK_URL`);
  }

  return reqs.length
    ? `#\n# Additional feature requirements:\n${reqs.join('\n')}`
    : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CODE REVIEW  ──  Amazon Bedrock (Claude) PR/MR review snippets
//
// Uses the Converse API with:
//   modelId   : us.anthropic.claude-sonnet-4-6  (cross-region, higher availability)
//   maxTokens : 1024  (explicit — avoids silently reserving 64K quota)
//
// Only runs on PR / MR events — never on branch pushes.
// ─────────────────────────────────────────────────────────────────────────────

// Shared Python core: gets diff, calls Bedrock Converse API, stores REVIEW_BODY
const AI_REVIEW_PYTHON_CORE = `\
import boto3, json, os, sys, subprocess

# 1. Collect the diff
diff = subprocess.getoutput(
    "git diff HEAD~1 HEAD -- . "
    "':(exclude)*.lock' ':(exclude)package-lock.json' "
    "':(exclude)*.min.js' ':(exclude)dist/'"
).strip()

if not diff:
    print("No diff to review — skipping AI review.")
    sys.exit(0)

MAX = 8000
if len(diff) > MAX:
    diff = diff[:MAX] + "\\n\\n... (diff truncated to 8 000 chars)"

# 2. Call Amazon Bedrock — Converse API
client = boto3.client(
    "bedrock-runtime",
    region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
)

prompt = (
    "You are a senior software engineer reviewing a pull request.\\n"
    "Analyse the diff and provide a concise review covering:\\n"
    "- **Bugs & Logic Errors** — potential runtime errors or wrong logic\\n"
    "- **Security Issues** — injection, secrets exposure, auth flaws\\n"
    "- **Performance** — inefficient operations or bottlenecks\\n"
    "- **Code Quality** — readability, naming, structure, best practices\\n"
    "- **Suggestions** — specific, actionable improvements\\n\\n"
    "Be direct and concise. Format as Markdown. Skip praise.\\n\\n"
    "\`\`\`diff\\n" + diff + "\\n\`\`\`"
)

response = client.converse(
    modelId="us.anthropic.claude-sonnet-4-6",
    messages=[{"role": "user", "content": [{"text": prompt}]}],
    inferenceConfig={"maxTokens": 1024},
)

review = response["output"]["message"]["content"][0]["text"]
REVIEW_BODY = (
    "## \\U0001f916 AI Code Review\\n\\n"
    + review
    + "\\n\\n---\\n*Powered by Amazon Bedrock \\u2014 Claude Sonnet 4.6*"
)
print(REVIEW_BODY)
`;

// ── GitLab CI job ─────────────────────────────────────────────────────────────

export function gitlabAiReviewJob(flags) {
  if (!flags.hasAiCodeReview) return '';
  return `
# ── AI Code Review (Amazon Bedrock) ──────────────────────────────────────────
# Runs on MRs only.
# Required: GITLAB_API_TOKEN (project token with api scope) + AWS credentials
ai-code-review:
  stage: Test
  image: python:3.12-slim
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: on_success
    - when: never
  variables:
    AWS_DEFAULT_REGION: eu-west-2
  script:
    - pip install boto3 requests --quiet
    - |
      python3 - << 'PYEOF'
${AI_REVIEW_PYTHON_CORE}
      # 3. Post review as MR note
      import requests as req
      resp = req.post(
          os.environ["CI_SERVER_URL"] + "/api/v4/projects/"
          + os.environ["CI_PROJECT_ID"] + "/merge_requests/"
          + os.environ["CI_MERGE_REQUEST_IID"] + "/notes",
          headers={"PRIVATE-TOKEN": os.environ["GITLAB_API_TOKEN"]},
          json={"body": REVIEW_BODY},
          timeout=15,
      )
      resp.raise_for_status()
      print("AI review posted to MR #" + os.environ["CI_MERGE_REQUEST_IID"])
      PYEOF
  allow_failure: true`;
}

// ── GitHub Actions job ────────────────────────────────────────────────────────

export function githubAiReviewJob(flags) {
  if (!flags.hasAiCodeReview) return '';
  return `
  # ── AI Code Review (Amazon Bedrock) ──────────────────────────────────────────
  # Runs on PRs only. Requires AWS_ROLE_ARN with bedrock:Converse permission.
  ai-code-review:
    name: AI Code Review (Bedrock)
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_ARN }}
          aws-region: \${{ vars.AWS_REGION || 'us-east-1' }}

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install boto3 requests --quiet

      - name: AI code review
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: \${{ github.event.pull_request.number }}
          REPO: \${{ github.repository }}
        run: |
          python3 - << 'PYEOF'
${AI_REVIEW_PYTHON_CORE}
          # 3. Post review as PR comment
          import requests as req
          resp = req.post(
              "https://api.github.com/repos/" + os.environ["REPO"]
              + "/issues/" + os.environ["PR_NUMBER"] + "/comments",
              headers={
                  "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
                  "Accept": "application/vnd.github.v3+json",
              },
              json={"body": REVIEW_BODY},
              timeout=15,
          )
          resp.raise_for_status()
          print("AI review posted to PR #" + os.environ["PR_NUMBER"])
          PYEOF
        continue-on-error: true`;
}

// ── Bitbucket step definitions ────────────────────────────────────────────────

export function bitbucketAiReviewStepDef(flags) {
  if (!flags.hasAiCodeReview) return '';
  return `
    - step: &ai-code-review
        name: AI Code Review (Bedrock)
        image: python:3.12-slim
        script:
          - pip install boto3 requests --quiet
          - |
            python3 - << 'PYEOF'
${AI_REVIEW_PYTHON_CORE}
            # 3. Post review to Bitbucket PR
            import requests as req
            resp = req.post(
                "https://api.bitbucket.org/2.0/repositories/"
                + os.environ["BITBUCKET_WORKSPACE"] + "/"
                + os.environ["BITBUCKET_REPO_SLUG"]
                + "/pullrequests/" + os.environ["BITBUCKET_PR_ID"] + "/comments",
                headers={"Authorization": "Bearer " + os.environ["BITBUCKET_ACCESS_TOKEN"]},
                json={"content": {"raw": REVIEW_BODY}},
                timeout=15,
            )
            resp.raise_for_status()
            print("AI review posted to PR #" + os.environ["BITBUCKET_PR_ID"])
            PYEOF`;
}

export function bitbucketAiReviewPipelineStep(flags) {
  return flags.hasAiCodeReview ? `      - step: *ai-code-review` : '';
}

// ── CodePipeline — write review to artifact (no native PR concept) ────────────

export function codepipelineAiReviewCmds(flags) {
  if (!flags.hasAiCodeReview) return '';
  return `
      - echo "Running AI code review..."
      - pip install boto3 --quiet
      - |
        python3 - << 'PYEOF'
${AI_REVIEW_PYTHON_CORE}
        with open("ai-code-review.md", "w") as f:
            f.write(REVIEW_BODY)
        print("AI review saved to ai-code-review.md")
        PYEOF`;
}
