/**
 * AWS SAM IaC template.
 * Runtime is matched to the selected project type.
 */

// Map project type ID → SAM runtime string
function resolveRuntime(projectType, projectTypeConfig = {}) {
  const ptId    = projectType?.id;
  const pyVer   = projectTypeConfig?.pythonVersion ?? '3.14';
  const javaVer = projectTypeConfig?.javaVersion   ?? '21';
  const nodeVer = (projectTypeConfig?.nodeVersion  ?? '26').replace('.x', '');
  const dotVer  = (projectTypeConfig?.dotnetVersion ?? '8.0').split('.')[0];

  if (['django-api', 'fastapi', 'python-lambda', 'api-gateway', 'serverless', 'cdk-stack'].includes(ptId))
    return `python${pyVer}`;
  if (['java-spring', 'java-lambda'].includes(ptId))
    return `java${javaVer}`;
  if (['nodejs-api', 'nodejs-lambda', 'react-mfe', 'react-shell'].includes(ptId))
    return `nodejs${nodeVer}.x`;
  if (ptId === 'dotnet-api')
    return `dotnet${dotVer}`;
  return 'python3.14';
}

function handlerFiles(runtime) {
  if (runtime.startsWith('python')) return [{
    path: 'src/handler.py',
    content: `import json\nimport logging\n\nlogger = logging.getLogger()\nlogger.setLevel("INFO")\n\n\ndef lambda_handler(event: dict, context) -> dict:\n    logger.info("Event: %s", json.dumps(event, default=str))\n    return {\n        "statusCode": 200,\n        "headers": {"Content-Type": "application/json"},\n        "body": json.dumps({"status": "ok"}),\n    }\n`,
  }, { path: 'requirements.txt', content: '# Runtime dependencies\n' }];

  if (runtime.startsWith('nodejs')) return [{
    path: 'src/handler.js',
    content: `'use strict';\nexports.handler = async (event) => {\n  console.log('Event:', JSON.stringify(event));\n  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ok' }) };\n};\n`,
  }, { path: 'package.json', content: JSON.stringify({ name: 'lambda-src', version: '1.0.0' }, null, 2) }];

  if (runtime.startsWith('java')) return [{
    path: 'src/main/java/Handler.java',
    content: `import com.amazonaws.services.lambda.runtime.*;\nimport com.amazonaws.services.lambda.runtime.events.*;\nimport java.util.Map;\n\npublic class Handler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {\n    @Override\n    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context ctx) {\n        return new APIGatewayProxyResponseEvent().withStatusCode(200).withHeaders(Map.of("Content-Type","application/json")).withBody("{\\"status\\":\\"ok\\"}");\n    }\n}\n`,
  }];

  return [{ path: 'src/handler.py', content: '' }];
}

export function buildAwsSamFiles({ projectName, appName, description, projectType = null, projectTypeConfig = {} }) {
  const runtime = resolveRuntime(projectType, projectTypeConfig);
  const handler = runtime.startsWith('python') ? 'handler.lambda_handler'
                : runtime.startsWith('nodejs') ? 'handler.handler'
                : 'Handler';

  const langLabel = runtime.startsWith('python') ? 'Python' : runtime.startsWith('nodejs') ? 'Node.js' : runtime.startsWith('java') ? 'Java' : '.NET';

  return [
    {
      path: 'template.yaml',
      content: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: ${description || projectName}

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: ${runtime}
    Architectures: [x86_64]

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
      Handler: ${handler}
      Description: ${description || projectName}
      Environment:
        Variables:
          ENV: !Ref Environment
      Events:
        ApiRoot:
          Type: Api
          Properties:
            Path: /
            Method: ANY
        ApiProxy:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY

Outputs:
  ApiEndpoint:
    Value: !Sub "https://\${ServerlessRestApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}/"
    Export:
      Name: !Sub "\${AWS::StackName}-api"
`,
    },
    {
      path: 'samconfig.toml',
      content: `version = 0.1\n\n[default.global.parameters]\nstack_name = "${projectName}"\n\n[default.deploy.parameters]\ncapabilities = "CAPABILITY_IAM"\nconfirm_changeset = false\nfail_on_empty_changeset = false\nregion = "eu-west-2"\nresolve_s3 = true\n`,
    },
    ...handlerFiles(runtime),
    { path: '.gitignore', content: `.aws-sam/\n__pycache__/\nnode_modules/\ntarget/\n*.log\n.DS_Store\n` },
    {
      path: 'README.md',
      content: `# ${projectName} — AWS SAM\n\n${description || ''}\n\nRuntime: **${runtime}** (${langLabel})\n\n\`\`\`bash\nsam build\nsam deploy --guided   # first time\nsam deploy             # subsequent\nsam local start-api    # local dev\n\`\`\`\n`,
    },
  ];
}

export const AWS_SAM_PREVIEW_VARS = { projectName: 'my-sam-app', appName: 'my_sam_app', pascalName: 'MySamApp', description: 'AWS SAM application', projectType: { id: 'python-lambda' }, projectTypeConfig: { pythonVersion: '3.14' } };
export const AWS_SAM_META = { id: 'sam', label: 'AWS SAM', description: 'AWS SAM · Runtime adapts to Project Type · template.yaml', fileCount: 5 };
