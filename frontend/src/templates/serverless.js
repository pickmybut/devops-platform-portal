/**
 * Serverless project template.
 * AWS SAM or Serverless Framework — runtime adapts to config.
 */

const RUNTIME_MAP = {
  'python3.12': { handler: 'handler.lambda_handler', srcFile: 'handler.py', lang: 'Python', req: 'requirements.txt' },
  'python3.14': { handler: 'handler.lambda_handler', srcFile: 'handler.py', lang: 'Python', req: 'requirements.txt' },
  'nodejs20.x': { handler: 'handler.lambdaHandler', srcFile: 'handler.js', lang: 'Node.js', req: 'package.json' },
  'java21':     { handler: 'com.radius.Handler::handleRequest', srcFile: 'src/Handler.java', lang: 'Java', req: 'pom.xml' },
};

export function buildServerlessFiles({ projectName, appName, description, config = {} }) {
  const framework = config.framework ?? 'sam';
  const runtime   = config.runtime   ?? 'python3.14';
  const rtInfo    = RUNTIME_MAP[runtime] ?? RUNTIME_MAP['python3.14'];

  const files = [];

  if (framework === 'sam') {
    files.push({
      path: 'template.yaml',
      content: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: ${description || projectName + ' — SAM Application'}

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: ${runtime}
    Environment:
      Variables:
        ENV: !Ref Environment

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  ${appName}Function:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: ${rtInfo.handler}
      Description: ${description || projectName}
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
        RootEvent:
          Type: Api
          Properties:
            Path: /
            Method: ANY

Outputs:
  ApiEndpoint:
    Value: !Sub "https://\${ServerlessRestApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}/"
    Export:
      Name: !Sub "\${AWS::StackName}-ApiEndpoint"
`,
    });

    files.push({
      path: 'samconfig.toml',
      content: `version = 0.1

[default.global.parameters]
stack_name = "${projectName}"

[default.deploy.parameters]
capabilities = "CAPABILITY_IAM"
confirm_changeset = false
fail_on_empty_changeset = false
region = "eu-west-2"
resolve_s3 = true

[default.build.parameters]
use_container = false
`,
    });
  } else {
    // Serverless Framework
    files.push({
      path: 'serverless.yml',
      content: `service: ${projectName}
description: ${description || ''}

provider:
  name: aws
  runtime: ${runtime}
  region: eu-west-2
  stage: \${opt:stage, 'dev'}
  environment:
    ENV: \${self:provider.stage}

functions:
  app:
    handler: ${rtInfo.handler}
    description: ${description || projectName}
    events:
      - httpApi:
          path: /
          method: ANY
      - httpApi:
          path: /{proxy+}
          method: ANY

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
`,
    });
  }

  // Source handler
  if (runtime.startsWith('python')) {
    files.push({
      path: 'src/handler.py',
      content: `"""${projectName} serverless handler."""
import json
import logging

logger = logging.getLogger()
logger.setLevel("INFO")


def lambda_handler(event: dict, context) -> dict:
    logger.info("Event: %s", json.dumps(event, default=str))
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": "Hello from ${projectName}"}),
    }
`,
    });
    files.push({ path: 'requirements.txt', content: '# Runtime dependencies\n' });
    files.push({ path: 'requirements-dev.txt', content: '-r requirements.txt\npytest==8.3.4\nhttpx==0.28.1\n' });
  } else if (runtime.startsWith('nodejs')) {
    files.push({
      path: 'src/handler.js',
      content: `'use strict';

exports.lambdaHandler = async (event, context) => {
  console.log('Event:', JSON.stringify(event));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from ${projectName}' }),
  };
};
`,
    });
    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: projectName,
        version: '1.0.0',
        description: description || '',
        scripts: { test: 'jest', offline: 'serverless offline' },
        devDependencies: { jest: '^29.0.0', 'serverless-offline': '^14.0.0' },
      }, null, 2),
    });
  }

  files.push({ path: '.gitignore', content: `__pycache__/\n*.py[cod]\n.venv/\n.env\n*.log\n.DS_Store\n.aws-sam/\n.serverless/\nnode_modules/\n` });

  files.push({
    path: 'README.md',
    content: `# ${projectName}

${description || 'Serverless application.'}

## Stack

${rtInfo.lang} · ${framework === 'sam' ? 'AWS SAM' : 'Serverless Framework'} · Runtime: ${runtime}

## Build & Deploy

${framework === 'sam' ? `\`\`\`bash
# Build
sam build

# Deploy (first time)
sam deploy --guided

# Deploy (subsequent)
sam deploy
\`\`\`` : `\`\`\`bash
npm install
serverless deploy --stage dev
\`\`\``}

## Local development

${framework === 'sam' ? `\`\`\`bash
sam local start-api --port 3000
\`\`\`` : `\`\`\`bash
serverless offline
\`\`\``}
`,
  });

  return files;
}

export const SERVERLESS_PREVIEW_VARS = {
  projectName: 'my-serverless-app',
  appName:     'my_serverless_app',
  description: 'AWS Serverless application',
  config:      { framework: 'sam', runtime: 'python3.14' },
};

export const SERVERLESS_META = {
  id:          'serverless',
  label:       'Serverless',
  description: 'AWS SAM or Serverless Framework — runtime adapts to project type',
  fileCount:   7,
};
