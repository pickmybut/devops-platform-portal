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
    hasMendSast:   has('mend-sast'),
    hasMendSca:    has('mend-sca'),
    hasGitLabSast: has('gitlab-sast'),
    hasDepScan:    has('dependency-scan'),
    hasSlack:      has('slack-notifications'),
    hasReadme:     has('readme'),  // file-only, no pipeline injection
    hasAny:        features.length > 0,
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
