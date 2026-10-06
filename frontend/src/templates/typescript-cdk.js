/** TypeScript CDK v2 — files in devops/cdk/ */

const CDK_JSON = { app: 'npx ts-node --prefer-ts-exts bin/app.ts', watch: { include: ['**'], exclude: ['README.md', 'cdk*.json', 'node_modules', 'cdk.out', 'dist'] }, context: { '@aws-cdk/aws-lambda:recognizeLayerVersion': true, '@aws-cdk/core:checkSecretUsage': true, '@aws-cdk/aws-iam:minimizePolicies': true, '@aws-cdk/core:validateSnapshotRemovalPolicy': true, '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true, '@aws-cdk/core:enablePartitionLiterals': true, '@aws-cdk/customresources:installLatestAwsSdkDefault': false, '@aws-cdk/aws-ec2:restrictDefaultSecurityGroup': true, '@aws-cdk/aws-s3:publicAccessBlockedByDefault': true } };

export function buildTypescriptCdkFiles({ projectName, appName, pascalName, description, infra }) {
  const infraComment = getInfraComment(infra);

  return [
    {
      path: 'devops/cdk/package.json',
      content: JSON.stringify({
        name: `${projectName}-cdk`,
        version: '1.0.0',
        description: description || '',
        scripts: { build: 'tsc', watch: 'tsc -w', cdk: 'cdk' },
        devDependencies: { 'aws-cdk': '^2.172.0', 'aws-cdk-lib': '^2.172.0', constructs: '^10.8.0', 'ts-node': '^10.9.2', typescript: '^5.7.2' },
        dependencies: { 'aws-cdk-lib': '^2.272.0', constructs: '^10.8.0' },
      }, null, 2),
    },
    {
      path: 'devops/cdk/tsconfig.json',
      content: JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'commonjs', lib: ['es2020'], declaration: true, strict: true, noImplicitAny: true, strictNullChecks: true, noImplicitThis: true, esModuleInterop: true, inlineSourceMap: true, typeRoots: ['./node_modules/@types'] }, exclude: ['node_modules', 'cdk.out'] }, null, 2),
    },
    { path: 'devops/cdk/cdk.json', content: JSON.stringify(CDK_JSON, null, 2) },
    {
      path: 'devops/cdk/bin/app.ts',
      content: `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ${pascalName}Stack } from '../lib/main-stack';

const app = new cdk.App();

new ${pascalName}Stack(app, \`${pascalName}Stack-\${process.env.CI_ENVIRONMENT_NAME ?? 'Dev'}\`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});
`,
    },
    {
      path: 'devops/cdk/lib/main-stack.ts',
      content: `import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
${infraComment.imports}

export class ${pascalName}Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Add your AWS resources here ────────────────────────────────────────
${infraComment.body}
    new cdk.CfnOutput(this, 'StackName', { value: this.stackName });
  }
}
`,
    },
    { path: 'devops/cdk/.gitignore', content: `node_modules/\ncdk.out/\ndist/\n*.js\n*.d.ts\n!jest.config.js\n*.log\n.DS_Store\n` },
    {
      path: 'devops/cdk/README.md',
      content: `# ${projectName} — CDK Infrastructure (TypeScript)\n\n${description || ''}\n\n\`\`\`bash\ncd devops/cdk\nnpm install\nnpm run build\ncdk synth\ncdk deploy\n\`\`\`\n`,
    },
  ];
}

function getInfraComment(infra) {
  const id = infra?.id ?? 'none';
  if (id === 'ecs-fargate') return { imports: "import * as ec2 from 'aws-cdk-lib/aws-ec2';\nimport * as ecs from 'aws-cdk-lib/aws-ecs';\nimport * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';", body: `    const vpc     = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });\n    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });\n    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', { cluster, cpu: 256, memoryLimitMiB: 512, desiredCount: 1, taskImageOptions: { image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample') } });` };
  if (id === 'lambda') return { imports: "import * as lambda from 'aws-cdk-lib/aws-lambda';", body: `    new lambda.Function(this, 'Function', { runtime: lambda.Runtime.PYTHON_3_14, handler: 'handler.lambda_handler', code: lambda.Code.fromAsset('../../src') });` };
  if (id === 's3-cloudfront') return { imports: "import * as s3 from 'aws-cdk-lib/aws-s3';\nimport * as cf from 'aws-cdk-lib/aws-cloudfront';\nimport * as origins from 'aws-cdk-lib/aws-cloudfront-origins';", body: `    const bucket = new s3.Bucket(this, 'Bucket', { removalPolicy: cdk.RemovalPolicy.DESTROY });\n    new cf.Distribution(this, 'Distribution', { defaultBehavior: { origin: new origins.S3StaticWebsiteOrigin(bucket) } });` };
  return { imports: '', body: '    // Add resources here' };
}

export const TYPESCRIPT_CDK_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'TypeScript CDK infrastructure', infra: null };
export const TYPESCRIPT_CDK_META = { id: 'typescript-cdk', label: 'TypeScript CDK', description: 'AWS CDK v2 · TypeScript · devops/cdk/', fileCount: 7 };
