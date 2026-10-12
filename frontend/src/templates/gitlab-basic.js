/**
 * Basic Pipeline — dynamic .gitlab-ci.yml generator.
 *
 * Composes test + deploy stages based on:
 *   projectType     — what language / framework is being used
 *   iac             — what infrastructure tool will be deployed
 *   projectTypeConfig — version + database choices
 *   features        — additional features to inject (security, Slack, etc.)
 */

import {
  parseFeatureFlags,
  gitlabFeatureIncludes,
  gitlabSecurityJobs,
  gitlabSlackJobs,
  gitlabAiReviewJob,
  gitlabSecretDetectionJob,
  gitlabContainerScanJob,
  gitlabDastJob,
  gitlabSonarCloudJob,
  gitlabInfracostJob,
  gitlabMsTeamsJobs,
  gitlabSmokeTestJobs,
  gitlabReleaseAutoJob,
  featureRequirementsComment,
} from './feature-snippets.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared rule snippets (inlined per-job — no multi-merge-key issues)
// ─────────────────────────────────────────────────────────────────────────────

// ── Test jobs: run on any branch + MR, never on schedule or tags ─────────────
const RULES_ALL_BRANCHES = `  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
      when: never
    - if: '$CI_COMMIT_TAG'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: on_success
    - if: '$CI_COMMIT_BRANCH'
      when: on_success
    - when: never`;

// ── Build / deploy: auto on default, manual on feature, never MR/tag/schedule ─
const RULES_BUILD_DEPLOY = `  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: never
    - if: '$CI_COMMIT_TAG'
      when: never
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - if: '$CI_COMMIT_BRANCH'
      when: manual
      allow_failure: true
    - when: never`;

// ── Destroy: only on a tag starting with "destroy", manual ───────────────────
// Create the tag from the default branch: git tag destroy-staging && git push origin destroy-staging
const RULES_DESTROY_TAG = `  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: never
    - if: '$CI_COMMIT_TAG =~ /^destroy/'
      when: manual
    - when: never`;
const RULES_MR_AND_MAIN = `  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: on_success
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - when: never`;

const RULES_MAIN_MANUAL = `  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
    - when: never`;

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

function generate({ projectName, appName, projectType, iac, infra, projectTypeConfig, features = [] }) {
  const ptId   = projectType?.id ?? null;
  const iacId  = iac?.id         ?? 'none';
  const infraId= infra?.id       ?? 'none';
  const cfg    = projectTypeConfig ?? {};

  // ── Project-type flags ──────────────────────────────────────────────────
  const isDjango      = ptId === 'django-api';
  const isFastApi     = ptId === 'fastapi';
  const isLambdaPy    = ptId === 'python-lambda';
  const isServerless  = ptId === 'serverless';
  const isCdkStack    = ptId === 'cdk-stack';
  const isPythonApp   = isDjango || isFastApi;
  const isPython      = isPythonApp || isLambdaPy || isServerless || ptId === 'api-gateway';
  const isJava        = ptId === 'java-spring' || ptId === 'java-lambda';
  const isMfe         = ptId === 'react-mfe' || ptId === 'react-shell';
  const isNodeApi     = ptId === 'nodejs-api';
  const isNodeLambda  = ptId === 'nodejs-lambda';
  const isNode        = isMfe || isNodeApi || isNodeLambda || isCdkStack;
  const isDotnet      = ptId === 'dotnet-api';

  // ── IaC flags ───────────────────────────────────────────────────────────
  const hasPyCdk    = iacId === 'python-cdk';
  const hasTsCdk    = iacId === 'typescript-cdk';
  const hasCsharpCdk= iacId === 'csharp-cdk';
  const hasCdk      = hasPyCdk || hasTsCdk || hasCsharpCdk || isCdkStack;
  const hasTf       = iacId === 'terraform';
  const hasCfn      = iacId === 'cloudformation';
  const hasSam      = iacId === 'sam';
  const hasPulumiPy = iacId === 'pulumi-python';
  const hasPulumiTs = iacId === 'pulumi-ts';
  const hasIac      = iacId !== 'none';

  // ── Infra architecture flags ─────────────────────────────────────────────
  const isEcsFargate  = infraId === 'ecs-fargate';
  const isEcsEc2      = infraId === 'ecs-ec2';
  const isEcs         = isEcsFargate || isEcsEc2;
  const isEks         = infraId === 'eks';
  const isLambdaInfra = infraId === 'lambda';
  const isAppRunner   = infraId === 'k8s-ec2';   // self-managed K8s on EC2
  const isS3Cf        = infraId === 's3-cloudfront';
  const isEc2         = infraId === 'ec2';
  const needsDocker   = isEcs || isEks || isAppRunner; // these require Docker build + ECR push
  const hasInfraArch  = infraId !== 'none';

  // ── Feature flags ─────────────────────────────────────────────────────────
  const feat = parseFeatureFlags(features, { needsDocker, hasTf, hasCdk });

  // ── Config values ───────────────────────────────────────────────────────
  const pythonVer  = cfg.pythonVersion  ?? '3.14';
  const javaVer    = cfg.javaVersion    ?? '21';
  const nodeVer    = cfg.nodeVersion    ?? '26';
  const dotnetVer  = cfg.dotnetVersion  ?? '8.0';
  const database   = cfg.database       ?? 'postgresql';

  const needsPostgres = isPythonApp && database === 'postgresql';
  const needsMysql    = isPythonApp && database === 'mysql';

  // ── Stages ─────────────────────────────────────────────────────────────
  const stages = [];
  if (!isCdkStack) stages.push('Test');
  // Build stage: Docker build for container architectures
  if (needsDocker || (isNode && isS3Cf)) stages.push('Build');
  // Validate stage: IaC validation
  if (hasCdk || hasTf || hasCfn || hasSam || hasPulumiPy || hasPulumiTs) stages.push('Validate');

  if (hasCdk) {
    // Full CDK pipeline flow
    stages.push('Deploy Staging');
    if (isEcs) stages.push('Reload Staging');
    stages.push('Performance Testing');
    stages.push('Rollback Staging');
    stages.push('Production Release');
    if (needsDocker) stages.push('Build Production');
    stages.push('Deploy Production');
    if (isEcs) stages.push('Reload Production');
    stages.push('Rollback Production');
    stages.push('Destroy');
  } else {
    // Non-CDK IaC or direct infra deploy
    if (hasIac || (hasInfraArch && infraId !== 'none')) stages.push('Deploy');
    if (hasTf) stages.push('Destroy');
  }

  // Add stages for features
  if (feat.hasDast)         stages.push('DAST');
  if (feat.hasSmokeTests)   stages.push('Smoke Test');
  if (feat.hasReleaseAuto)  stages.push('Release');

  const parts = [];

  // ── Feature includes (GitLab SAST / Dependency-Scanning templates) ───────
  const featureIncludes = gitlabFeatureIncludes(feat);
  if (featureIncludes) parts.push(featureIncludes);

  // ── Header ──────────────────────────────────────────────────────────────
  parts.push(
`# ──────────────────────────────────────────────────────────────────────────────
# GitLab CI/CD — ${projectName}
# Generated by the DevOps Self-Service Portal
#
# Project type : ${projectType?.name  ?? 'None'}
# IaC          : ${iac && iacId !== 'none' ? iac.name : 'None'}
#
# Required CI/CD variables (Settings → CI/CD → Variables):
#${hasCdk || hasTf || hasSam ? `
#   AWS_ACCESS_KEY_ID       IAM access key
#   AWS_SECRET_ACCESS_KEY   IAM secret key
#   CDK_DEFAULT_ACCOUNT     AWS account ID
#   CDK_DEFAULT_REGION      e.g. eu-west-2` : ' (none beyond standard GitLab vars)'}${featureRequirementsComment(feat, 'gitlab')}
# ──────────────────────────────────────────────────────────────────────────────`
  );

  // ── Stages block ────────────────────────────────────────────────────────
  parts.push(
`stages:
${stages.map(s => `  - ${s}`).join('\n')}`
  );

  // ── Variables block ─────────────────────────────────────────────────────
  const vars = [];
  if (needsDocker) {
    vars.push(
`  ECR_REGISTRY: "\${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_DEFAULT_REGION}.amazonaws.com"
  ECR_REPO:     "${appName}"
  IMAGE_TAG:    "\${ECR_REGISTRY}/\${ECR_REPO}:\${CI_COMMIT_SHORT_SHA}"`
    );
  }
  if (isPython || hasPulumiPy)  vars.push(`  PYTHON_IMAGE: "python:${pythonVer}-slim"`);
  if (isJava)                    vars.push(`  MAVEN_IMAGE:  "maven:3.9-eclipse-temurin-${javaVer}"\n  MAVEN_OPTS:   "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"`);
  if (isNode)                    vars.push(`  NODE_IMAGE:   "node:${nodeVer}-alpine"`);
  if (isDotnet)                  vars.push(`  DOTNET_IMAGE: "mcr.microsoft.com/dotnet/sdk:${dotnetVer}"`);
  if (isDjango) {
    vars.push(`  DJANGO_SETTINGS_MODULE: config.settings.development`);
    vars.push(`  SECRET_KEY: ci-test-secret-key`);
    if (needsPostgres) {
      vars.push(
`  DATABASE_URL:      "postgres://postgres:postgres@postgres:5432/${appName}_test"
  POSTGRES_DB:       "${appName}_test"
  POSTGRES_USER:     postgres
  POSTGRES_PASSWORD: postgres`
      );
    } else if (needsMysql) {
      vars.push(
`  DATABASE_URL:      "mysql+pymysql://root:root@mysql:3306/${appName}_test"
  MYSQL_DATABASE:    "${appName}_test"
  MYSQL_ROOT_PASSWORD: root`
      );
    }
  }
  if (hasCdk)  vars.push(`  CDK_DIR: "devops/cdk"`);
  if (hasTf)   vars.push(`  TF_DIR:  "$CI_PROJECT_DIR/devops/terraform"\n  TF_IMAGE: "hashicorp/terraform:1.9"`);
  if (hasSam)  vars.push(`  SAM_IMAGE: "public.ecr.aws/sam/build-python${pythonVer}:latest"`);

  if (vars.length) {
    parts.push(`variables:\n${vars.join('\n')}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST STAGE
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Python lint ─────────────────────────────────────────────────────────
  if (isPython && !isCdkStack) {
    parts.push(
`# ── Test ───────────────────────────────────────────────────────────────────────

Lint:
  stage: Test
  image: $PYTHON_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-pip"
    paths: [.cache/pip/]
${RULES_ALL_BRANCHES}
  script:
    - pip install ruff --cache-dir .cache/pip
    - ruff check .`
    );
  }

  // ── Django unit tests ────────────────────────────────────────────────────
  if (isDjango) {
    const svc = needsPostgres
      ? `  services:\n    - name: postgres:16-alpine\n      alias: postgres\n`
      : needsMysql
      ? `  services:\n    - name: mysql:8.0\n      alias: mysql\n`
      : '';

    parts.push(
`Unit Tests:
  stage: Test
  image: $PYTHON_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-pip"
    paths: [.cache/pip/]
${svc}${RULES_ALL_BRANCHES}
  script:
    - pip install -r requirements.txt --cache-dir .cache/pip
    - pytest --cov=apps --cov-report=xml -v
  coverage: '/TOTAL.*\\s(\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml`
    );
  }

  // ── FastAPI unit tests ───────────────────────────────────────────────────
  if (isFastApi) {
    const svc = needsPostgres
      ? `  services:\n    - name: postgres:16-alpine\n      alias: postgres\n`
      : '';

    parts.push(
`Unit Tests:
  stage: Test
  image: $PYTHON_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-pip"
    paths: [.cache/pip/]
${svc}${RULES_ALL_BRANCHES}
  script:
    - pip install -r requirements.txt --cache-dir .cache/pip
    - pytest --cov=. --cov-report=xml -v
  coverage: '/TOTAL.*\\s(\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml`
    );
  }

  // ── Python Lambda / Serverless tests ────────────────────────────────────
  if (isLambdaPy || isServerless) {
    parts.push(
`Unit Tests:
  stage: Test
  image: $PYTHON_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-pip"
    paths: [.cache/pip/]
${RULES_ALL_BRANCHES}
  script:
    - pip install -r requirements.txt pytest pytest-cov --cache-dir .cache/pip
    - pytest tests/ -v`
    );
  }

  // ── Java tests ───────────────────────────────────────────────────────────
  if (isJava) {
    parts.push(
`# ── Test ───────────────────────────────────────────────────────────────────────

Unit Tests:
  stage: Test
  image: $MAVEN_IMAGE
  cache:
    key: maven
    paths: [.m2/repository/]
${RULES_ALL_BRANCHES}
  script:
    - mvn test -q
  artifacts:
    reports:
      junit: target/surefire-reports/TEST-*.xml`
    );
  }

  // ── Node / React ─────────────────────────────────────────────────────────
  if (isNode) {
    parts.push(
`# ── Test ───────────────────────────────────────────────────────────────────────

Lint:
  stage: Test
  image: $NODE_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-npm"
    paths: [node_modules/]
${RULES_ALL_BRANCHES}
  script:
    - npm ci
    - npm run lint`
    );

    if (!isMfe) {
      parts.push(
`Unit Tests:
  stage: Test
  image: $NODE_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-npm"
    paths: [node_modules/]
${RULES_ALL_BRANCHES}
  script:
    - npm ci
    - npm test`
      );
    }

    parts.push(
`Build:
  stage: Test
  image: $NODE_IMAGE
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-npm"
    paths: [node_modules/]
${RULES_MAIN_MANUAL.replace('manual', 'on_success')}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 hour`
    );
  }

  // ── .NET ─────────────────────────────────────────────────────────────────
  if (isDotnet) {
    parts.push(
`# ── Test ───────────────────────────────────────────────────────────────────────

Unit Tests:
  stage: Test
  image: $DOTNET_IMAGE
${RULES_ALL_BRANCHES}
  script:
    - dotnet restore
    - dotnet test --no-restore --verbosity minimal`
    );
  }

  // ── No project type ───────────────────────────────────────────────────────
  if (!ptId) {
    parts.push(
`# ── Test ───────────────────────────────────────────────────────────────────────
# No project type selected — add your own test jobs here.
#
# Example:
# My Tests:
#   stage: Test
#   image: python:3.14-slim
#   rules:
#     - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
#     - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
#   script:
#     - echo "replace with real test command"`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD STAGE — Docker image for container architectures
  // ═══════════════════════════════════════════════════════════════════════════

  if (needsDocker) {
    parts.push(
`# ── Build ──────────────────────────────────────────────────────────────────────

Docker Build & Push:
  stage: Build
  image: docker:24
  services:
    - docker:24-dind
${RULES_BUILD_DEPLOY}
  before_script:
    - aws ecr get-login-password --region $AWS_DEFAULT_REGION
        | docker login --username AWS --password-stdin $ECR_REGISTRY
    # Create ECR repo if it doesn't exist
    - aws ecr describe-repositories --repository-names $ECR_REPO --region $AWS_DEFAULT_REGION
        || aws ecr create-repository --repository-name $ECR_REPO --region $AWS_DEFAULT_REGION
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
    - echo "IMAGE_TAG=$IMAGE_TAG" > build.env
  artifacts:
    reports:
      dotenv: build.env
    expire_in: 1 hour`
    );
  }

  // S3 + CloudFront: static build is handled in the test stage (isNode Build job)
  // but the deploy stage needs the dist/ artifact — already covered by the Build job above.

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY STAGE — Infra-specific (when NO IaC is selected)
  // When CDK/Terraform is present, they handle the deploy instead.
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasInfraArch && infraId !== 'none' && !hasIac) {
    parts.push(`# ── Infra Deploy (no IaC) ─────────────────────────────────────────────────────`);

    if (isEcs) {
      parts.push(
`Deploy Dev (ECS):
  stage: Deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
  needs: ["Docker Build & Push"]
${RULES_MAIN_MANUAL}
  script:
    # Force a new deployment — ECS pulls the latest image from ECR
    - aws ecs update-service
        --cluster $ECS_CLUSTER_NAME
        --service $ECS_SERVICE_NAME
        --force-new-deployment
        --region $AWS_DEFAULT_REGION
    # Wait until the service is stable
    - aws ecs wait services-stable
        --cluster $ECS_CLUSTER_NAME
        --services $ECS_SERVICE_NAME
        --region $AWS_DEFAULT_REGION`
      );
    }

    if (isEks) {
      parts.push(
`Deploy Dev (EKS):
  stage: Deploy
  image: alpine/k8s:1.28.9
  environment:
    name: Development
  needs: ["Docker Build & Push"]
${RULES_MAIN_MANUAL}
  before_script:
    - aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_DEFAULT_REGION
  script:
    - kubectl set image deployment/${appName} app=$IMAGE_TAG --namespace $KUBE_NAMESPACE
    - kubectl rollout status deployment/${appName} --namespace $KUBE_NAMESPACE`
      );
    }

    if (isAppRunner) {
      parts.push(
`Deploy Dev (K8s on EC2):
  stage: Deploy
  image: alpine/k8s:1.28.9
  environment:
    name: Development
  needs: ["Docker Build & Push"]
${RULES_MAIN_MANUAL}
  before_script:
    # Configure kubectl to point at your self-managed cluster
    - mkdir -p ~/.kube
    - echo "$KUBE_CONFIG" | base64 -d > ~/.kube/config
  script:
    - helm upgrade --install ${appName} ./helm
        --set image.repository=$ECR_REGISTRY/$ECR_REPO
        --set image.tag=$CI_COMMIT_SHORT_SHA
        --namespace $KUBE_NAMESPACE
        --create-namespace
        --wait`
      );
    }

    if (isLambdaInfra) {
      const pkgCmd = isPython
        ? `    - pip install -r requirements.txt -t ./package/\n    - cp -r *.py ./package/\n    - cd package && zip -r ../function.zip . && cd ..`
        : isJava
        ? `    - mvn package -DskipTests -q\n    - cp target/*.jar function.zip`
        : `    - npm ci && npm run build\n    - zip -r function.zip dist/ node_modules/`;

      parts.push(
`Package Lambda:
  stage: Build
  image: ${isPython ? '$PYTHON_IMAGE' : isJava ? '$MAVEN_IMAGE' : '$NODE_IMAGE'}
${RULES_MAIN_MANUAL.replace('manual', 'on_success')}
  script:
${pkgCmd}
  artifacts:
    paths: [function.zip]
    expire_in: 1 hour

Deploy Dev (Lambda):
  stage: Deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
  needs: ["Package Lambda"]
${RULES_MAIN_MANUAL}
  script:
    - aws lambda update-function-code
        --function-name $LAMBDA_FUNCTION_NAME
        --zip-file fileb://function.zip
        --region $AWS_DEFAULT_REGION
    - aws lambda wait function-updated --function-name $LAMBDA_FUNCTION_NAME`
      );
    }

    if (isS3Cf) {
      parts.push(
`Deploy Dev (S3 + CloudFront):
  stage: Deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
  needs: ["Build"]
${RULES_MAIN_MANUAL}
  script:
    - aws s3 sync dist/ s3://$S3_BUCKET_NAME --delete --region $AWS_DEFAULT_REGION
    - aws cloudfront create-invalidation
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID
        --paths "/*"`
      );
    }

    if (isEc2) {
      parts.push(
`Package Artifact:
  stage: Build
  image: ${isPython ? '$PYTHON_IMAGE' : isJava ? '$MAVEN_IMAGE' : '$NODE_IMAGE'}
${RULES_MAIN_MANUAL.replace('manual', 'on_success')}
  script:
    - zip -r artifact.zip . --exclude ".git/*" "node_modules/*" ".venv/*"
    - aws s3 cp artifact.zip s3://$ARTIFACT_BUCKET/${appName}/$CI_COMMIT_SHORT_SHA/artifact.zip
  artifacts:
    paths: [artifact.zip]
    expire_in: 1 hour

Deploy Dev (EC2):
  stage: Deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
  needs: ["Package Artifact"]
${RULES_MAIN_MANUAL}
  script:
    - aws deploy create-deployment
        --application-name $CODEDEPLOY_APP_NAME
        --deployment-group-name $CODEDEPLOY_GROUP_DEV
        --s3-location bucket=$ARTIFACT_BUCKET,bundleType=zip,key=${appName}/$CI_COMMIT_SHORT_SHA/artifact.zip
        --region $AWS_DEFAULT_REGION`
      );
    }
  }

  // When CDK is present with a container architecture, pass imageTag as CDK context
  // so the stack can reference the newly built ECR image.

  // ═══════════════════════════════════════════════════════════════════════════
  // CDK
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasCdk) {
    const cdkImage  = hasTsCdk  ? '$NODE_IMAGE' : '$PYTHON_IMAGE';
    const cdkSetup  = hasTsCdk
      ? `    - npm ci --prefix $CDK_DIR\n    - npm install -g aws-cdk --silent`
      : `    - pip install -r $CDK_DIR/requirements.txt --cache-dir .cache/pip\n    - npm install -g aws-cdk --silent`;
    const cdkCache  = hasTsCdk
      ? `  cache:\n    key: "\${CI_COMMIT_REF_SLUG}-npm"\n    paths: [node_modules/]`
      : `  cache:\n    key: "\${CI_COMMIT_REF_SLUG}-pip"\n    paths: [.cache/pip/]`;

    parts.push(
`# ── CDK ────────────────────────────────────────────────────────────────────────

CDK Synth:
  stage: Validate
  image: ${cdkImage}
${cdkCache}
${RULES_MR_AND_MAIN}
  before_script:
${cdkSetup}
  script:
    - cd $CDK_DIR && cdk synth

# ── Deploy Staging ──────────────────────────────────────────────────────────────

Deploy Staging:
  stage: Deploy Staging
  image: ${cdkImage}
${cdkCache}
  environment:
    name: Staging
${RULES_BUILD_DEPLOY}
  before_script:
${cdkSetup}
  script:
    - cd $CDK_DIR && cdk deploy --require-approval never${needsDocker ? ' --context imageTag=$CI_COMMIT_SHORT_SHA' : ''}
${isEcs ? `
# ── Reload Staging ──────────────────────────────────────────────────────────────
# Force a rolling restart so the new task definition is applied immediately.

Reload Staging:
  stage: Reload Staging
  image: amazon/aws-cli:latest
  environment:
    name: Staging
  needs: ["Deploy Staging"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - when: never
  script:
    - aws ecs update-service
        --cluster $ECS_CLUSTER_STAGING
        --service $ECS_SERVICE_STAGING
        --force-new-deployment
        --region $AWS_DEFAULT_REGION
    - aws ecs wait services-stable
        --cluster $ECS_CLUSTER_STAGING
        --services $ECS_SERVICE_STAGING
        --region $AWS_DEFAULT_REGION` : ''}

# ── Performance Testing ─────────────────────────────────────────────────────────

Load Test:
  stage: Performance Testing
  image: grafana/k6:latest
  environment:
    name: Staging
  needs: [${isEcs ? '"Reload Staging"' : '"Deploy Staging"'}]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
      allow_failure: true
    - when: never
  variables:
    K6_TARGET_URL: $STAGING_URL
  script:
    - k6 run tests/load-test.js
        --vus 10
        --duration 60s
        --env TARGET_URL=$K6_TARGET_URL

# ── Rollback Staging ────────────────────────────────────────────────────────────
# Rolls back the Staging CloudFormation stack to its last stable state.
# Trigger manually if Deploy Staging or Load Test reveals issues.

Rollback Staging:
  stage: Rollback Staging
  image: amazon/aws-cli:latest
  environment:
    name: Staging
  needs: ["Deploy Staging"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
      allow_failure: true
    - when: never
  script:
    - aws cloudformation rollback-stack
        --stack-name ${projectName}Stack-staging
        --region $AWS_DEFAULT_REGION

# ── Production Release ──────────────────────────────────────────────────────────
# Manual gate — must be approved before production jobs run.
# Only available on the default branch after Load Test has executed.

Production Release:
  stage: Production Release
  image: alpine:latest
  needs: ["Load Test"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
    - when: never
  script:
    - echo "✅ Production release approved for $CI_COMMIT_SHORT_SHA"
${needsDocker ? `
# ── Build Production ────────────────────────────────────────────────────────────
# Promotes the staging Docker image to the 'production' tag in ECR.
# No rebuild — deploy exactly what was tested in staging.

Promote to Production:
  stage: Build Production
  image: amazon/aws-cli:latest
  needs: ["Production Release"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - when: never
  script:
    - MANIFEST=$(aws ecr batch-get-image
          --repository-name $ECR_REPO
          --image-ids imageTag=$CI_COMMIT_SHORT_SHA
          --query 'images[0].imageManifest'
          --output text
          --region $AWS_DEFAULT_REGION)
    - aws ecr put-image
          --repository-name $ECR_REPO
          --image-tag production
          --image-manifest "$MANIFEST"
          --region $AWS_DEFAULT_REGION` : ''}

# ── Deploy Production ───────────────────────────────────────────────────────────

Deploy Production:
  stage: Deploy Production
  image: ${cdkImage}
${cdkCache}
  environment:
    name: Production
  needs: [${needsDocker ? '"Promote to Production"' : '"Production Release"'}]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
    - when: never
  before_script:
${cdkSetup}
  script:
    - cd $CDK_DIR && cdk deploy --require-approval never${needsDocker ? ' --context imageTag=production' : ''}
${isEcs ? `
# ── Reload Production ───────────────────────────────────────────────────────────

Reload Production:
  stage: Reload Production
  image: amazon/aws-cli:latest
  environment:
    name: Production
  needs: ["Deploy Production"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success
    - when: never
  script:
    - aws ecs update-service
        --cluster $ECS_CLUSTER_PROD
        --service $ECS_SERVICE_PROD
        --force-new-deployment
        --region $AWS_DEFAULT_REGION
    - aws ecs wait services-stable
        --cluster $ECS_CLUSTER_PROD
        --services $ECS_SERVICE_PROD
        --region $AWS_DEFAULT_REGION` : ''}

# ── Rollback Production ─────────────────────────────────────────────────────────
# Rolls back the Production CloudFormation stack to its last stable state.
# Trigger manually — high-impact action.

Rollback Production:
  stage: Rollback Production
  image: amazon/aws-cli:latest
  environment:
    name: Production
  needs: ["Deploy Production"]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
      allow_failure: true
    - when: never
  script:
    - aws cloudformation rollback-stack
        --stack-name ${projectName}Stack-production
        --region $AWS_DEFAULT_REGION

# ── Destroy ─────────────────────────────────────────────────────────────────────
# Only runs on a tag starting with "destroy" (e.g. git tag destroy-staging).

Destroy Staging:
  stage: Destroy
  image: ${cdkImage}
${cdkCache}
  environment:
    name: Staging
${RULES_DESTROY_TAG}
  before_script:
${cdkSetup}
  script:
    - cd $CDK_DIR && cdk destroy --force`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRAFORM
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasTf) {
    parts.push(
`# ── Terraform ───────────────────────────────────────────────────────────────────

Validate:
  stage: Validate
  image: $TF_IMAGE
${RULES_MR_AND_MAIN}
  before_script:
    - terraform -chdir=$TF_DIR init -input=false
  script:
    - terraform -chdir=$TF_DIR validate
    - terraform -chdir=$TF_DIR fmt -check

Plan:
  stage: Validate
  image: $TF_IMAGE
${RULES_MR_AND_MAIN}
  before_script:
    - terraform -chdir=$TF_DIR init -input=false
  script:
    - terraform -chdir=$TF_DIR plan -out=tfplan -input=false
  artifacts:
    paths: [tfplan]
    expire_in: 1 hour

Apply Dev:
  stage: Deploy
  image: $TF_IMAGE
  environment:
    name: Development
${RULES_MAIN_MANUAL}
  before_script:
    - terraform -chdir=$TF_DIR init -input=false
  script:
    - terraform -chdir=$TF_DIR apply -input=false tfplan

Destroy Dev:
  stage: Destroy
  image: $TF_IMAGE
  environment:
    name: Development
${RULES_DESTROY_TAG}
  before_script:
    - terraform -chdir=$TF_DIR init -input=false
  script:
    - terraform -chdir=$TF_DIR destroy -auto-approve`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AWS SAM
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasSam) {
    parts.push(
`# ── AWS SAM ─────────────────────────────────────────────────────────────────────

SAM Validate:
  stage: Validate
  image: $SAM_IMAGE
${RULES_MR_AND_MAIN}
  script:
    - sam validate

SAM Deploy Dev:
  stage: Deploy
  image: $SAM_IMAGE
  environment:
    name: Development
${RULES_MAIN_MANUAL}
  script:
    - sam deploy
        --no-confirm-changeset
        --no-fail-on-empty-changeset
        --stack-name ${projectName}-dev
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUDFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasCfn) {
    parts.push(
`# ── CloudFormation ──────────────────────────────────────────────────────────────

Validate Template:
  stage: Validate
  image: "python:${pythonVer}-slim"
${RULES_MR_AND_MAIN}
  script:
    - pip install cfn-lint
    - cfn-lint devops/cloudformation/template.yaml

Deploy Dev:
  stage: Deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
${RULES_MAIN_MANUAL}
  script:
    - aws cloudformation deploy
        --template-file devops/cloudformation/template.yaml
        --stack-name ${projectName}-dev
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PULUMI
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasPulumiPy || hasPulumiTs) {
    const pulumiImage   = hasPulumiPy ? '$PYTHON_IMAGE' : '$NODE_IMAGE';
    const pulumiInstall = hasPulumiPy
      ? `    - pip install pulumi pulumi-aws --cache-dir .cache/pip`
      : `    - npm ci\n    - npm install -g pulumi`;

    parts.push(
`# ── Pulumi ──────────────────────────────────────────────────────────────────────

Preview:
  stage: Validate
  image: ${pulumiImage}
${RULES_MR_AND_MAIN}
  before_script:
${pulumiInstall}
  script:
    - pulumi preview --stack dev

Deploy Dev:
  stage: Deploy
  image: ${pulumiImage}
  environment:
    name: Development
${RULES_MAIN_MANUAL}
  before_script:
${pulumiInstall}
  script:
    - pulumi up --yes --stack dev`
    );
  }

  // ── Feature: security + quality jobs ────────────────────────────────────
  const secJobs = gitlabSecurityJobs(feat);
  if (secJobs) parts.push(secJobs);

  const secretJob = gitlabSecretDetectionJob(feat);
  if (secretJob) parts.push(secretJob);

  const containerScanJob = gitlabContainerScanJob(feat);
  if (containerScanJob) parts.push(containerScanJob);

  const sonarJob = gitlabSonarCloudJob(feat);
  if (sonarJob) parts.push(sonarJob);

  const infracostJob = gitlabInfracostJob(feat);
  if (infracostJob) parts.push(infracostJob);

  const dastJob = gitlabDastJob(feat);
  if (dastJob) parts.push(dastJob);

  const smokeJobs = gitlabSmokeTestJobs(feat);
  if (smokeJobs) parts.push(smokeJobs);

  // ── Feature: AI code review ──────────────────────────────────────────────
  const aiReview = gitlabAiReviewJob(feat);
  if (aiReview) parts.push(aiReview);

  // ── Feature: Release Automation ──────────────────────────────────────────
  const releaseJob = gitlabReleaseAutoJob(feat);
  if (releaseJob) parts.push(releaseJob);

  // ── Feature: Notifications (.post stage) ────────────────────────────────
  const slackJobs = gitlabSlackJobs(feat, projectName);
  if (slackJobs) parts.push(slackJobs);

  const teamsJobs = gitlabMsTeamsJobs(feat, projectName);
  if (teamsJobs) parts.push(teamsJobs);

  return parts.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function buildBasicPipelineFiles({
  projectName    = 'my-project',
  appName        = 'my_project',
  pascalName     = 'MyProject',
  projectType    = null,
  iac            = null,
  infra          = null,
  projectTypeConfig = {},
  features       = [],
}) {
  return [
    {
      path: '.gitlab-ci.yml',
      content: generate({ projectName, appName, projectType, iac, infra, projectTypeConfig, features }),
    },
  ];
}

// ── Preview defaults ──────────────────────────────────────────────────────────

export const BASIC_PIPELINE_PREVIEW_VARS = {
  projectName:    'my-django-api',
  appName:        'my_django_api',
  pascalName:     'MyDjangoApi',
  // Preview uses Django API + Python CDK + ECS Fargate so all sections are visible
  projectType:    { id: 'django-api', name: 'Django API' },
  iac:            { id: 'python-cdk', name: 'Python CDK' },
  infra:          { id: 'ecs-fargate', name: 'ECS Fargate' },
  projectTypeConfig: { pythonVersion: '3.14', database: 'postgresql' },
};

export const BASIC_PIPELINE_META = {
  id:          'basic',
  label:       'Basic Pipeline',
  description: 'Adapts to your Project Type + IaC selections',
  fileCount:   1,
};
