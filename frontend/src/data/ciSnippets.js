export const CI_CATEGORIES = [
  { id: 'build',    label: 'Build',          icon: '🔨' },
  { id: 'test',     label: 'Test',            icon: '🧪' },
  { id: 'deploy',   label: 'Deploy',          icon: '🚀' },
  { id: 'infra',    label: 'Infrastructure',  icon: '☁️' },
  { id: 'security', label: 'Security',        icon: '🔒' },
];

export const CI_SNIPPETS = [
  // ── Build ──────────────────────────────────────────────────────────────────
  {
    id: 'docker-build',
    category: 'build',
    name: 'Docker Build & Push',
    description: 'Builds a Docker image and pushes it to the GitLab Container Registry.',
    code: `Build Docker Image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'`,
  },
  {
    id: 'npm-build',
    category: 'build',
    name: 'npm Build (Webpack)',
    description: 'Installs npm dependencies and runs a production webpack build with caching.',
    code: `npm Build:
  stage: build
  image: node:20-slim
  cache:
    key: '\$CI_COMMIT_REF_SLUG-node'
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour`,
  },
  {
    id: 'maven-build',
    category: 'build',
    name: 'Maven Build',
    description: 'Compiles a Java project with Maven, with repository caching.',
    code: `Maven Build:
  stage: build
  image: maven:3.9-eclipse-temurin-17
  cache:
    key: maven
    paths:
      - .m2/repository/
  variables:
    MAVEN_OPTS: "-Dmaven.repo.local=\$CI_PROJECT_DIR/.m2/repository"
  script:
    - mvn package -DskipTests -q
  artifacts:
    paths:
      - target/*.jar`,
  },

  // ── Test ───────────────────────────────────────────────────────────────────
  {
    id: 'jest-test',
    category: 'test',
    name: 'Jest Unit Tests',
    description: 'Runs Jest tests and uploads coverage reports as an artifact.',
    code: `Unit Tests:
  stage: test
  image: node:20-slim
  cache:
    key: '\$CI_COMMIT_REF_SLUG-node'
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Lines\\s*:\\s*(\\d+\\.?\\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml`,
  },
  {
    id: 'pytest',
    category: 'test',
    name: 'Python pytest',
    description: 'Runs pytest with coverage reporting for Python services.',
    code: `Python Tests:
  stage: test
  image: python:3.12-slim
  script:
    - pip install -r requirements.txt pytest pytest-cov
    - pytest tests/ -v --cov=. --cov-report=xml
  coverage: '/TOTAL.*\\s(\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml`,
  },
  {
    id: 'maven-test',
    category: 'test',
    name: 'Maven Surefire Tests',
    description: 'Runs JUnit tests via Maven Surefire and publishes test reports.',
    code: `Java Tests:
  stage: test
  image: maven:3.9-eclipse-temurin-17
  variables:
    MAVEN_OPTS: "-Dmaven.repo.local=\$CI_PROJECT_DIR/.m2/repository"
  script:
    - mvn test -q
  artifacts:
    reports:
      junit:
        - target/surefire-reports/TEST-*.xml`,
  },

  // ── Deploy ─────────────────────────────────────────────────────────────────
  {
    id: 'cdk-deploy',
    category: 'deploy',
    name: 'AWS CDK Deploy',
    description: 'Deploys a CDK stack to AWS for a given environment.',
    code: `CDK Deploy:
  stage: deploy
  image: python:3.12-slim
  environment:
    name: \$CI_ENVIRONMENT_NAME
  before_script:
    - pip install -r requirements.txt
    - npm install -g aws-cdk
  script:
    - cdk deploy --require-approval never
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'
      when: on_success
    - when: manual`,
  },
  {
    id: 's3-deploy',
    category: 'deploy',
    name: 'S3 Static Deploy',
    description: 'Syncs a dist/ folder to an S3 bucket and invalidates CloudFront.',
    code: `Deploy to S3:
  stage: deploy
  image: amazon/aws-cli:latest
  script:
    - aws s3 sync dist/ s3://\$S3_BUCKET_NAME --delete
    - aws cloudfront create-invalidation
        --distribution-id \$CLOUDFRONT_DISTRIBUTION_ID
        --paths "/*"
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'`,
  },
  {
    id: 'lambda-deploy',
    category: 'deploy',
    name: 'Lambda Deploy (zip)',
    description: 'Packages a Python Lambda and updates the function code directly.',
    code: `Deploy Lambda:
  stage: deploy
  image: python:3.12-slim
  script:
    - pip install -r requirements.txt -t ./package
    - cp lambda_function.py ./package/
    - cd package && zip -r ../function.zip .
    - aws lambda update-function-code
        --function-name \$LAMBDA_FUNCTION_NAME
        --zip-file fileb://../function.zip
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'`,
  },

  // ── Infrastructure ─────────────────────────────────────────────────────────
  {
    id: 'cdk-synth',
    category: 'infra',
    name: 'CDK Synth (Validate)',
    description: 'Synthesises a CDK app to validate CloudFormation output, no deploy.',
    code: `CDK Synth:
  stage: validate
  image: python:3.12-slim
  before_script:
    - pip install -r requirements.txt
    - npm install -g aws-cdk
  script:
    - cdk synth
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'`,
  },
  {
    id: 'cdk-destroy',
    category: 'infra',
    name: 'CDK Destroy',
    description: 'Tears down a CDK environment — manual trigger only.',
    code: `CDK Destroy:
  stage: destroy
  image: python:3.12-slim
  environment:
    name: \$CI_ENVIRONMENT_NAME
  before_script:
    - pip install -r requirements.txt
    - npm install -g aws-cdk
  script:
    - cdk destroy --force
  rules:
    - when: manual
      allow_failure: true`,
  },
  {
    id: 'terraform-validate',
    category: 'infra',
    name: 'Terraform Validate',
    description: 'Initializes Terraform and validates configuration syntax.',
    code: `Terraform Validate:
  stage: validate
  image:
    name: hashicorp/terraform:1.9
    entrypoint: [""]
  script:
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check -recursive
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'`,
  },
  {
    id: 'terraform-plan',
    category: 'infra',
    name: 'Terraform Plan',
    description: 'Generates an execution plan and saves it as an artifact for review.',
    code: `Terraform Plan:
  stage: plan
  image:
    name: hashicorp/terraform:1.9
    entrypoint: [""]
  script:
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - tfplan
    expire_in: 1 day
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'`,
  },
  {
    id: 'terraform-apply',
    category: 'infra',
    name: 'Terraform Apply',
    description: 'Applies the saved Terraform plan to provision infrastructure.',
    code: `Terraform Apply:
  stage: deploy
  image:
    name: hashicorp/terraform:1.9
    entrypoint: [""]
  environment:
    name: \$CI_ENVIRONMENT_NAME
  dependencies:
    - Terraform Plan
  script:
    - terraform init
    - terraform apply -auto-approve tfplan
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'
      when: manual`,
  },
  {
    id: 'terraform-destroy',
    category: 'infra',
    name: 'Terraform Destroy',
    description: 'Destroys all resources managed by Terraform — manual trigger only.',
    code: `Terraform Destroy:
  stage: destroy
  image:
    name: hashicorp/terraform:1.9
    entrypoint: [""]
  environment:
    name: \$CI_ENVIRONMENT_NAME
  script:
    - terraform init
    - terraform destroy -auto-approve
  rules:
    - when: manual
      allow_failure: true`,
  },
  {
    id: 'terraform-full-pipeline',
    category: 'infra',
    name: 'Terraform Full Pipeline',
    description: 'Complete Terraform workflow with remote S3 backend and state locking.',
    code: `variables:
  TF_ROOT: "\${CI_PROJECT_DIR}/terraform"
  TF_STATE_NAME: \$CI_PROJECT_NAME

.terraform-base:
  image:
    name: hashicorp/terraform:1.9
    entrypoint: [""]
  before_script:
    - cd \$TF_ROOT
    - |
      cat > backend.tf <<EOF
      terraform {
        backend "s3" {
          bucket         = "\$TF_STATE_BUCKET"
          key            = "\$TF_STATE_NAME/terraform.tfstate"
          region         = "\$AWS_DEFAULT_REGION"
          dynamodb_table = "\$TF_LOCK_TABLE"
          encrypt        = true
        }
      }
      EOF
    - terraform init

Terraform Validate:
  extends: .terraform-base
  stage: validate
  script:
    - terraform validate
    - terraform fmt -check -recursive
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'

Terraform Plan:
  extends: .terraform-base
  stage: plan
  script:
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - \$TF_ROOT/tfplan
    expire_in: 1 day
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'

Terraform Apply:
  extends: .terraform-base
  stage: deploy
  environment:
    name: production
  dependencies:
    - Terraform Plan
  script:
    - terraform apply -auto-approve tfplan
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'
      when: manual`,
  },

  // ── Security ───────────────────────────────────────────────────────────────
  {
    id: 'sast',
    category: 'security',
    name: 'GitLab SAST',
    description: 'Runs GitLab built-in Static Application Security Testing (SAST).',
    code: `include:
  - template: Security/SAST.gitlab-ci.yml

SAST:
  stage: test
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'`,
  },
  {
    id: 'dependency-scan',
    category: 'security',
    name: 'Dependency Scanning',
    description: 'Scans dependencies for known CVEs using GitLab Dependency Scanning.',
    code: `include:
  - template: Security/Dependency-Scanning.gitlab-ci.yml

dependency_scanning:
  stage: test
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'`,
  },
];
