/**
 * API Gateway project template.
 * REST or HTTP API with Lambda integration and OpenAPI definition.
 */

export function buildApiGatewayFiles({ projectName, appName, description, config = {} }) {
  const apiType = config.apiType ?? 'rest';
  const auth    = config.auth    ?? 'none';

  return [
    {
      path: 'openapi/api.yaml',
      content: `openapi: "3.0.3"
info:
  title: ${projectName}
  description: ${description || ''}
  version: "1.0.0"

paths:
  /health:
    get:
      summary: Health check
      operationId: healthCheck
      responses:
        "200":
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri: !Sub "arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${LambdaFunction.Arn}/invocations"
        passthroughBehavior: when_no_match

  /{proxy+}:
    x-amazon-apigateway-any-method:
      summary: Proxy all requests to Lambda
      operationId: proxy
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Proxied response
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri: !Sub "arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${LambdaFunction.Arn}/invocations"
        passthroughBehavior: when_no_match
`,
    },
    {
      path: 'template.yaml',
      content: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: ${description || projectName + ' — API Gateway + Lambda'}

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  LambdaFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/
      Handler: handler.lambda_handler
      Runtime: python3.14
      Timeout: 30
      MemorySize: 256
      Events:
        ApiRoot:
          Type: ${apiType === 'http' ? 'HttpApi' : 'Api'}
          Properties:
            Path: /
            Method: ANY
        ApiProxy:
          Type: ${apiType === 'http' ? 'HttpApi' : 'Api'}
          Properties:
            Path: /{proxy+}
            Method: ANY

Outputs:
  ApiEndpoint:
    Value: !Sub "https://\${ServerlessRestApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}/"
`,
    },
    {
      path: 'lambda/handler.py',
      content: `"""${projectName} Lambda handler backing API Gateway."""
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))


def lambda_handler(event: dict, context) -> dict:
    logger.info("Event: %s", json.dumps(event, default=str))

    method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", "GET"))
    path   = event.get("path", event.get("requestContext", {}).get("http", {}).get("path", "/"))

    if path == "/health":
        return _response(200, {"status": "ok"})

    return _response(200, {"message": "Hello from ${projectName}", "path": path, "method": method})


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
`,
    },
    {
      path: 'lambda/requirements.txt',
      content: '# Lambda runtime dependencies\n# boto3 is pre-installed in the Lambda runtime\n',
    },
    {
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
`,
    },
    {
      path: '.gitignore',
      content: `__pycache__/\n*.py[cod]\n.venv/\n.env\n*.log\n.aws-sam/\n.DS_Store\n`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}

${description || 'API Gateway + Lambda application.'}

## API Type: ${apiType === 'http' ? 'HTTP API (v2)' : 'REST API (v1)'}${auth !== 'none' ? `\n## Auth: ${auth}` : ''}

## Deploy

\`\`\`bash
sam build
sam deploy --guided
\`\`\`

## Local dev

\`\`\`bash
sam local start-api
# → http://localhost:3000
\`\`\`

## OpenAPI spec

Edit \`openapi/api.yaml\` to define your API contract.
`,
    },
  ];
}

export const API_GATEWAY_PREVIEW_VARS = {
  projectName: 'my-api-gateway',
  appName:     'my_api_gateway',
  description: 'REST API Gateway with Lambda integration',
  config:      { apiType: 'rest', auth: 'none' },
};

export const API_GATEWAY_META = {
  id:          'api-gateway',
  label:       'API Gateway',
  description: 'REST/HTTP API Gateway · Lambda · OpenAPI · SAM',
  fileCount:   7,
};
