/** CDK Stack — standalone Python CDK project at project root */

export function buildCdkStackFiles({ projectName, appName, pascalName, description, config = {} }) {
  return [
    {
      path: 'app.py',
      content: `#!/usr/bin/env python3
"""CDK entry point for ${projectName}."""
import os
from aws_cdk import App, Environment
from stacks.main_stack import ${pascalName}Stack

app = App()
env = Environment(account=os.environ.get("CDK_DEFAULT_ACCOUNT"), region=os.environ.get("CDK_DEFAULT_REGION", "eu-west-2"))
${pascalName}Stack(app, f"${pascalName}Stack-{os.environ.get('CI_ENVIRONMENT_NAME', 'Dev')}", env=env)
app.synth()
`,
    },
    {
      path: 'cdk.json',
      content: JSON.stringify({ app: 'python3 app.py', watch: { include: ['**'], exclude: ['README.md', 'cdk*.json', 'requirements*.txt', '**/__pycache__', 'tests'] }, context: { '@aws-cdk/aws-lambda:recognizeLayerVersion': true, '@aws-cdk/core:checkSecretUsage': true, '@aws-cdk/aws-iam:minimizePolicies': true, '@aws-cdk/core:validateSnapshotRemovalPolicy': true, '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true, '@aws-cdk/core:enablePartitionLiterals': true, '@aws-cdk/customresources:installLatestAwsSdkDefault': false, '@aws-cdk/aws-ec2:restrictDefaultSecurityGroup': true, '@aws-cdk/aws-s3:publicAccessBlockedByDefault': true } }, null, 2),
    },
    {
      path: 'requirements.txt',
      content: `aws-cdk-lib>=2.272.0\nconstructs>=10.8.0\n`,
    },
    {
      path: 'requirements-dev.txt',
      content: `-r requirements.txt\npytest>=8.3.0\npytest-cov>=6.0.0\n`,
    },
    { path: 'stacks/__init__.py', content: '' },
    {
      path: 'stacks/main_stack.py',
      content: `"""${pascalName} — main CDK stack.\n\n${description || ''}\n"""\nfrom aws_cdk import CfnOutput, Stack\nfrom constructs import Construct\n\n\nclass ${pascalName}Stack(Stack):\n    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:\n        super().__init__(scope, construct_id, **kwargs)\n\n        # ── Add your AWS resources here ────────────────────────────────────\n\n        CfnOutput(self, "StackName", value=self.stack_name)\n`,
    },
    { path: 'tests/__init__.py', content: '' },
    { path: 'tests/unit/__init__.py', content: '' },
    {
      path: 'tests/unit/test_main_stack.py',
      content: `import aws_cdk as cdk\nfrom aws_cdk import assertions\nfrom stacks.main_stack import ${pascalName}Stack\n\n\ndef test_stack_synthesizes():\n    app   = cdk.App()\n    stack = ${pascalName}Stack(app, "TestStack")\n    template = assertions.Template.from_stack(stack)\n    template.has_output("StackName", {})\n`,
    },
    { path: 'pytest.ini', content: `[pytest]\ntestpaths = tests\naddopts = -q\n` },
    { path: '.gitignore', content: `__pycache__/\n*.py[cod]\n.venv/\nvenv/\ncdk.out/\n.pytest_cache/\n*.log\n.DS_Store\n` },
    {
      path: 'README.md',
      content: `# ${projectName}\n\n${description || 'AWS CDK infrastructure stack.'}\n\n\`\`\`bash\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements-dev.txt\ncdk synth\ncdk deploy\n\`\`\`\n`,
    },
  ];
}

export const CDK_STACK_PREVIEW_VARS = { projectName: 'my-cdk-stack', appName: 'my_cdk_stack', pascalName: 'MyCdkStack', description: 'AWS CDK infrastructure stack', config: {} };
export const CDK_STACK_META = { id: 'cdk-stack', label: 'CDK Stack', description: 'Python 3 · AWS CDK v2 · pytest · Standalone', fileCount: 12 };
