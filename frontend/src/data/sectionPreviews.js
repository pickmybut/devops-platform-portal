/**
 * Code snippets shown in the right preview panel when the user interacts
 * with the IaC or CI/CD sections.
 *
 * Each entry: { title, filename, description, content }
 * null = "None" selected → show the empty-state prompt.
 */

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE AS CODE
// ─────────────────────────────────────────────────────────────────────────────

export const IAC_PREVIEWS = {
  none: null,

  'python-cdk': {
    title: 'Python CDK',
    filename: 'devops/cdk/app.py',
    description: 'AWS CDK v2 entry point — synthesises all stacks',
    content: `#!/usr/bin/env python3
"""CDK entry point — synthesises all stacks for this service."""
import os
from aws_cdk import App, Environment
from stacks.main_stack import MainStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "eu-west-2"),
)

MainStack(
    app,
    f"MainStack-{os.environ.get('CI_ENVIRONMENT_NAME', 'Dev')}",
    env=env,
)

app.synth()
`,
    secondFile: {
      filename: 'devops/cdk/stacks/main_stack.py',
      content: `"""Main CDK stack — add your AWS resources here."""
from aws_cdk import Stack
from constructs import Construct


class MainStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ── Add your resources below ────────────────────────────────────────
        # e.g.
        # from aws_cdk import aws_s3 as s3
        # bucket = s3.Bucket(self, "MyBucket")
`,
    },
  },

  'typescript-cdk': {
    title: 'TypeScript CDK',
    filename: 'bin/app.ts',
    description: 'AWS CDK v2 entry point in TypeScript',
    content: `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';

const app = new cdk.App();

new MainStack(app, \`MainStack-\${process.env.CI_ENVIRONMENT_NAME ?? 'Dev'}\`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});
`,
    secondFile: {
      filename: 'lib/main-stack.ts',
      content: `import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Add your AWS resources here
    // e.g. new cdk.aws_s3.Bucket(this, 'MyBucket');
  }
}
`,
    },
  },

  'csharp-cdk': {
    title: 'C# CDK',
    filename: 'src/Program.cs',
    description: 'AWS CDK v2 entry point in C#',
    content: `using Amazon.CDK;

namespace CdkStack;

sealed class Program
{
    public static void Main(string[] args)
    {
        var app = new App();
        var envName = System.Environment.GetEnvironmentVariable("CI_ENVIRONMENT_NAME") ?? "Dev";

        new MainStack(app, $"MainStack-{envName}", new StackProps
        {
            Env = new Amazon.CDK.Environment
            {
                Account = System.Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT"),
                Region  = System.Environment.GetEnvironmentVariable("CDK_DEFAULT_REGION") ?? "eu-west-2",
            },
        });

        app.Synth();
    }
}
`,
    secondFile: {
      filename: 'src/MainStack.cs',
      content: `using Amazon.CDK;
using Constructs;

namespace CdkStack;

public class MainStack : Stack
{
    public MainStack(Construct scope, string id, IStackProps? props = null)
        : base(scope, id, props)
    {
        // Add your AWS resources here
        // e.g. new Amazon.CDK.AWS.S3.Bucket(this, "MyBucket");
    }
}
`,
    },
  },

  terraform: {
    title: 'Terraform',
    filename: 'main.tf',
    description: 'Terraform configuration — provider + starter resource',
    content: `terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure your remote state backend here
    # bucket = "my-terraform-state"
    # key    = "project/terraform.tfstate"
    # region = "eu-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Resources ────────────────────────────────────────────────────────────────
# Add your AWS resources here, e.g.:
#
# resource "aws_s3_bucket" "main" {
#   bucket = "\${var.project_name}-\${var.environment}"
# }
`,
    secondFile: {
      filename: 'variables.tf',
      content: `variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
}

variable "project_name" {
  description = "Short name used for resource naming"
  type        = string
}
`,
    },
  },

  cloudformation: {
    title: 'CloudFormation',
    filename: 'template.yaml',
    description: 'AWS CloudFormation template (YAML)',
    content: `AWSTemplateFormatVersion: '2010-09-09'
Description: CloudFormation stack for this service

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
    Default: dev

  ProjectName:
    Type: String
    Description: Short name used for resource naming

# ── Resources ────────────────────────────────────────────────────────────────
Resources:
  # Add your AWS resources here, e.g.:
  #
  # MyBucket:
  #   Type: AWS::S3::Bucket
  #   Properties:
  #     BucketName: !Sub "\${ProjectName}-\${Environment}"

# ── Outputs ──────────────────────────────────────────────────────────────────
Outputs:
  StackName:
    Value: !Ref AWS::StackName
    Export:
      Name: !Sub "\${AWS::StackName}-name"
`,
  },

  'pulumi-python': {
    title: 'Pulumi Python',
    filename: '__main__.py',
    description: 'Pulumi infrastructure program in Python',
    content: `"""Pulumi infrastructure program."""
import pulumi
import pulumi_aws as aws

config  = pulumi.Config()
env     = pulumi.get_stack()          # stack name = environment (dev/prod)
project = pulumi.get_project()

# ── Resources ────────────────────────────────────────────────────────────────
# Add your Pulumi resources here, e.g.:
#
# bucket = aws.s3.Bucket(f"{project}-{env}",
#     tags={"Environment": env, "Project": project})
#
# pulumi.export("bucket_name", bucket.id)

pulumi.export("environment", env)
pulumi.export("project",     project)
`,
  },

  'pulumi-ts': {
    title: 'Pulumi TypeScript',
    filename: 'index.ts',
    description: 'Pulumi infrastructure program in TypeScript',
    content: `import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config  = new pulumi.Config();
const env     = pulumi.getStack();      // stack name = environment (dev/prod)
const project = pulumi.getProject();

// ── Resources ──────────────────────────────────────────────────────────────
// Add your Pulumi resources here, e.g.:
//
// const bucket = new aws.s3.Bucket(\`\${project}-\${env}\`, {
//   tags: { Environment: env, Project: project },
// });
//
// export const bucketName = bucket.id;

export const environment = env;
export const projectName  = project;
`,
  },

  sam: {
    title: 'AWS SAM',
    filename: 'template.yaml',
    description: 'AWS Serverless Application Model template',
    content: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: SAM application

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: python3.12
    Environment:
      Variables:
        ENV: !Ref Environment

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  # ── Lambda function ────────────────────────────────────────────────────────
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: app.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY

  # ── API Gateway ────────────────────────────────────────────────────────────
  ServerlessRestApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment

Outputs:
  ApiEndpoint:
    Value: !Sub "https://\${ServerlessRestApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}/"
`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CI / CD
// ─────────────────────────────────────────────────────────────────────────────

export const CICD_PREVIEWS = {
  none: null,

  'gitlab-standard': {
    title: 'GitLab CI Standard',
    filename: '.gitlab-ci.yml',
    description: 'Test → Build → Deploy stages',
    content: `stages:
  - test
  - build
  - deploy

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# ── Test ──────────────────────────────────────────────────────────────────────
Lint:
  stage: test
  image: python:3.12-slim
  script:
    - pip install ruff
    - ruff check .
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Unit Tests:
  stage: test
  image: python:3.12-slim
  script:
    - pip install -r requirements.txt pytest pytest-cov
    - pytest --cov=. --cov-report=xml -v
  coverage: '/TOTAL.*\\s(\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

# ── Build ─────────────────────────────────────────────────────────────────────
Build Image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

# ── Deploy ────────────────────────────────────────────────────────────────────
Deploy Dev:
  stage: deploy
  environment:
    name: Development
  script:
    - echo "Deploy $IMAGE_TAG to dev"
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
`,
  },

  'gitlab-mfe': {
    title: 'GitLab CI MFE',
    filename: '.gitlab-ci.yml',
    description: 'Extends velocity-mfe-devops base CI template',
    content: `include:
  - project: 'innovation/velocity-mfe-devops'
    ref: main
    file:
      - '/gitlab-ci/templates/npm-registry-template.yml'
      - '/gitlab-ci/templates/node-cache-template.yml'
      - '/gitlab-ci/templates/bundle-template.yml'
      - '/gitlab-ci/templates/cdk-deploy-template.yml'
      - '/gitlab-ci/templates/common-scripts.yml'
      - '/gitlab-ci/templates/cloudfront-invalidation-template.yml'
      - '/gitlab-ci/templates/mend-template.yml'
      - '/gitlab-ci/templates/slack-notification-template.yml'
      - '/gitlab-ci/templates/test-template.yml'
      - '/gitlab-ci/templates/mfe-base-ci.yml'

variables:
  MFE_APP_NAME: "my-app"
  MFE_APP_TYPE: "mfe"           # or "shell"
  MFE_DEFAULT_BRANCH: "main"
`,
  },

  'gitlab-docker': {
    title: 'Docker Build',
    filename: '.gitlab-ci.yml',
    description: 'Build and push image to GitLab Container Registry',
    content: `stages:
  - build

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  LATEST_TAG: $CI_REGISTRY_IMAGE:latest

Build & Push:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build --cache-from $LATEST_TAG -t $IMAGE_TAG -t $LATEST_TAG .
    - docker push $IMAGE_TAG
    - docker push $LATEST_TAG
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      variables:
        IMAGE_TAG: $CI_REGISTRY_IMAGE:mr-$CI_MERGE_REQUEST_IID
`,
  },

  'gitlab-lambda': {
    title: 'Lambda Deploy',
    filename: '.gitlab-ci.yml',
    description: 'Package zip, upload to S3, update Lambda function',
    content: `stages:
  - test
  - package
  - deploy

variables:
  PYTHON_IMAGE: python:3.12-slim

Test:
  stage: test
  image: $PYTHON_IMAGE
  script:
    - pip install -r requirements.txt pytest
    - pytest tests/ -v
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

Package:
  stage: package
  image: $PYTHON_IMAGE
  script:
    - pip install -r requirements.txt -t ./package/
    - cp lambda_function.py ./package/
    - cd package && zip -r ../function.zip . && cd ..
  artifacts:
    paths:
      - function.zip
    expire_in: 1 hour
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Deploy Dev:
  stage: deploy
  image: amazon/aws-cli:latest
  environment:
    name: Development
  script:
    - aws s3 cp function.zip s3://$LAMBDA_BUCKET/$CI_COMMIT_SHORT_SHA/function.zip
    - aws lambda update-function-code
        --function-name $LAMBDA_FUNCTION_NAME
        --s3-bucket $LAMBDA_BUCKET
        --s3-key $CI_COMMIT_SHORT_SHA/function.zip
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
`,
  },

  'gitlab-cdk': {
    title: 'CDK Deploy',
    filename: '.gitlab-ci.yml',
    description: 'CDK synth on MR → deploy → destroy on demand',
    content: `stages:
  - validate
  - deploy
  - destroy

variables:
  PYTHON_IMAGE: python:3.12-slim

.cdk_setup:
  before_script:
    - pip install -r requirements.txt
    - npm install -g aws-cdk --silent

Synth:
  stage: validate
  image: $PYTHON_IMAGE
  extends: .cdk_setup
  script:
    - cd devops/cdk && cdk synth
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Deploy Dev:
  stage: deploy
  image: $PYTHON_IMAGE
  extends: .cdk_setup
  environment:
    name: Development
  script:
    - cd devops/cdk && cdk deploy --require-approval never
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: on_success

Deploy Prod:
  stage: deploy
  image: $PYTHON_IMAGE
  extends: .cdk_setup
  environment:
    name: Production
  script:
    - cd devops/cdk && cdk deploy --require-approval never
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual

Destroy Dev:
  stage: destroy
  image: $PYTHON_IMAGE
  extends: .cdk_setup
  environment:
    name: Development
  script:
    - cd devops/cdk && cdk destroy --force
  rules:
    - when: manual
      allow_failure: true
`,
  },

  'gitlab-java': {
    title: 'Java / Maven',
    filename: '.gitlab-ci.yml',
    description: 'Maven test → Docker build and push',
    content: `stages:
  - test
  - build

variables:
  MAVEN_IMAGE: maven:3.9-eclipse-temurin-21
  IMAGE_TAG:   $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  MAVEN_OPTS:  "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"

cache:
  key: maven-$CI_COMMIT_REF_SLUG
  paths:
    - .m2/repository/

Test:
  stage: test
  image: $MAVEN_IMAGE
  script:
    - mvn test -q
  artifacts:
    reports:
      junit: target/surefire-reports/TEST-*.xml
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Build Image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
`,
  },

  'gitlab-terraform': {
    title: 'Terraform CI',
    filename: '.gitlab-ci.yml',
    description: 'Plan on every MR, apply on merge to main',
    content: `stages:
  - validate
  - plan
  - apply

variables:
  TF_IMAGE: hashicorp/terraform:1.9
  TF_ROOT:  $CI_PROJECT_DIR

default:
  image: $TF_IMAGE

.tf_init: &tf_init
  before_script:
    - terraform -chdir=$TF_ROOT init -input=false

Validate:
  stage: validate
  <<: *tf_init
  script:
    - terraform -chdir=$TF_ROOT validate
    - terraform -chdir=$TF_ROOT fmt -check
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Plan:
  stage: plan
  <<: *tf_init
  script:
    - terraform -chdir=$TF_ROOT plan -out=tfplan -input=false
  artifacts:
    paths:
      - tfplan
    expire_in: 1 hour
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Apply:
  stage: apply
  <<: *tf_init
  script:
    - terraform -chdir=$TF_ROOT apply -input=false tfplan
  environment:
    name: Production
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
`,
  },
};
