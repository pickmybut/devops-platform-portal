/** Pulumi Python — files in devops/pulumi/ */

export function buildPulumiPythonFiles({ projectName, appName, pascalName, description, infra }) {
  const infraId = infra?.id ?? 'none';

  return [
    {
      path: 'devops/pulumi/Pulumi.yaml',
      content: `name: ${projectName}
runtime: python
description: ${description || ''}
`,
    },
    {
      path: 'devops/pulumi/__main__.py',
      content: `"""${projectName} — Pulumi Python infrastructure.

${description || ''}
"""
import pulumi
import pulumi_aws as aws

config  = pulumi.Config()
env     = pulumi.get_stack()          # stack name = environment (dev/prod)
project = pulumi.get_project()
name    = f"{project}-{env}"

# ── Resources ────────────────────────────────────────────────────────────────
${pulumiPyResources(infraId)}

pulumi.export("environment", env)
pulumi.export("project",     project)
`,
    },
    {
      path: 'devops/pulumi/requirements.txt',
      content: `pulumi>=3.0.0,<4.0.0\npulumi-aws>=6.0.0,<7.0.0\n`,
    },
    { path: 'devops/pulumi/.gitignore', content: `.venv/\nvenv/\n*.pyc\n__pycache__/\n.pulumi/\n*.log\n.DS_Store\n` },
    {
      path: 'devops/pulumi/README.md',
      content: `# ${projectName} — Pulumi (Python)\n\n${description || ''}\n\n\`\`\`bash\ncd devops/pulumi\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\npulumi stack init dev\npulumi up\n\`\`\`\n`,
    },
  ];
}

function pulumiPyResources(infraId) {
  if (infraId === 'ecs-fargate') return `cluster = aws.ecs.Cluster(f"{name}-cluster")\npulumi.export("cluster_arn", cluster.arn)`;
  if (infraId === 'lambda') return `fn = aws.lambda_.Function(f"{name}-fn",\n    runtime="python3.14",\n    handler="handler.lambda_handler",\n    role=aws.iam.Role(f"{name}-role", assume_role_policy=aws.iam.get_policy_document(statements=[...]).json).arn,\n    code=pulumi.FileArchive("../../src"),\n)\npulumi.export("function_arn", fn.arn)`;
  if (infraId === 's3-cloudfront') return `bucket = aws.s3.Bucket(f"{name}-site", website=aws.s3.BucketWebsiteArgs(index_document="index.html"))\npulumi.export("bucket_name", bucket.bucket)`;
  return `# Add your Pulumi resources here\n# e.g. bucket = aws.s3.Bucket(f"{name}-bucket")`;
}

export const PULUMI_PYTHON_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'Pulumi Python infrastructure', infra: null };
export const PULUMI_PYTHON_META = { id: 'pulumi-python', label: 'Pulumi Python', description: 'Pulumi v3 · Python · AWS · devops/pulumi/', fileCount: 5 };
