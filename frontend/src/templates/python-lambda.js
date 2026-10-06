/**
 * Python Lambda project template.
 * AWS Lambda function with typed handler, pytest, structured logging.
 */

const TRIGGER_COMMENTS = {
  'api-gateway': '# Triggered by API Gateway — event contains httpMethod, path, queryStringParameters, body',
  'sqs':         '# Triggered by SQS — event["Records"] contains a list of SQS messages',
  's3':          '# Triggered by S3 events — event["Records"][0]["s3"]["object"]["key"] is the object key',
  'scheduled':   '# Triggered by EventBridge / CloudWatch Events on a schedule',
};

export function buildPythonLambdaFiles({ projectName, appName, description, config = {} }) {
  const pyVer   = config.pythonVersion ?? '3.14';
  const trigger = config.trigger       ?? 'api-gateway';
  const comment = TRIGGER_COMMENTS[trigger] ?? '';

  const handlerReturn = trigger === 'api-gateway'
    ? `    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": "Hello from ${projectName}"}),
    }`
    : `    # Process event records
    for record in event.get("Records", [event]):
        logger.info("Processing record: %s", json.dumps(record))
    return {"status": "ok", "processed": len(event.get("Records", [event]))}`;

  return [
    {
      path: 'handler.py',
      content: `"""${projectName} Lambda handler.

${description || ''}
"""
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

${comment}


def lambda_handler(event: dict, context) -> dict:
    """
    Lambda entry point.

    Args:
        event:   Triggering event payload
        context: Lambda runtime context (function_name, remaining_time_in_millis, etc.)
    """
    logger.info("Event received: %s", json.dumps(event, default=str))

    try:
${handlerReturn.split('\n').map(l => '    ' + l).join('\n')}

    except Exception as exc:
        logger.exception("Unhandled exception")
        if "${trigger}" == "api-gateway":
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(exc)}),
            }
        raise
`,
    },
    {
      path: 'requirements.txt',
      content: `# Add your Lambda runtime dependencies here.
# Keep this minimal — Lambda has a 250 MB unzipped deployment limit.
# AWS SDK (boto3) is pre-installed in the Lambda runtime.
`,
    },
    {
      path: '.gitignore',
      content: `__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.env\n*.log\n.DS_Store\n.pytest_cache/\npackage/\nfunction.zip\n`,
    },
    {
      path: 'tests/__init__.py',
      content: '',
    },
    {
      path: 'tests/test_handler.py',
      content: `"""Unit tests for the Lambda handler."""
import json
import pytest
from handler import lambda_handler


class MockContext:
    function_name = "${projectName}"
    remaining_time_in_millis = 30_000


${trigger === 'api-gateway' ? `def test_handler_returns_200():
    event = {
        "httpMethod": "GET",
        "path": "/",
        "queryStringParameters": None,
        "body": None,
    }
    result = lambda_handler(event, MockContext())
    assert result["statusCode"] == 200
    body = json.loads(result["body"])
    assert "message" in body` : `def test_handler_processes_records():
    event = {"Records": [{"body": "test-message"}]}
    result = lambda_handler(event, MockContext())
    assert result["status"] == "ok"
    assert result["processed"] == 1`}
`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}

${description || 'AWS Lambda function in Python.'}

## Stack

Python ${pyVer} · AWS Lambda · Trigger: ${trigger}

## Local testing

\`\`\`bash
pip install pytest
pytest tests/ -v
\`\`\`

## Deploy (via CDK / SAM)

See the IaC section of this project for deployment configuration.

## Packaging manually

\`\`\`bash
pip install -r requirements.txt -t ./package/
cp handler.py ./package/
cd package && zip -r ../function.zip . && cd ..
\`\`\`
`,
    },
  ];
}

export const PYTHON_LAMBDA_PREVIEW_VARS = {
  projectName: 'my-lambda-function',
  appName:     'my_lambda_function',
  description: 'AWS Lambda function in Python',
  config:      { pythonVersion: '3.14', trigger: 'api-gateway' },
};

export const PYTHON_LAMBDA_META = {
  id:          'python-lambda',
  label:       'Python Lambda',
  description: 'Python 3.14 · AWS Lambda · pytest',
  fileCount:   6,
};
