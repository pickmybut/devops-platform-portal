/** Pulumi TypeScript — files in devops/pulumi/ */

export function buildPulumiTsFiles({ projectName, appName, pascalName, description, infra }) {
  const infraId = infra?.id ?? 'none';

  return [
    {
      path: 'devops/pulumi/Pulumi.yaml',
      content: `name: ${projectName}\nruntime: nodejs\ndescription: ${description || ''}\n`,
    },
    {
      path: 'devops/pulumi/package.json',
      content: JSON.stringify({
        name: `${projectName}-pulumi`,
        version: '1.0.0',
        devDependencies: { '@types/node': '^22.0.0', typescript: '^5.7.2' },
        dependencies: { '@pulumi/pulumi': '^3.0.0', '@pulumi/aws': '^6.0.0' },
      }, null, 2),
    },
    {
      path: 'devops/pulumi/tsconfig.json',
      content: JSON.stringify({ compilerOptions: { strict: true, target: 'ES2020', module: 'commonjs', moduleResolution: 'node', sourceMap: true, esModuleInterop: true, skipLibCheck: true }, files: ['index.ts'] }, null, 2),
    },
    {
      path: 'devops/pulumi/index.ts',
      content: `import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config  = new pulumi.Config();
const env     = pulumi.getStack();   // stack name = environment
const project = pulumi.getProject();
const name    = \`\${project}-\${env}\`;

// ── Resources ──────────────────────────────────────────────────────────────
${pulumiTsResources(infraId)}

export const environment = env;
export const projectName  = project;
`,
    },
    { path: 'devops/pulumi/.gitignore', content: `node_modules/\n.pulumi/\n*.js\n*.d.ts\n!index.ts\n*.log\n.DS_Store\n` },
    {
      path: 'devops/pulumi/README.md',
      content: `# ${projectName} — Pulumi (TypeScript)\n\n${description || ''}\n\n\`\`\`bash\ncd devops/pulumi\nnpm install\npulumi stack init dev\npulumi up\n\`\`\`\n`,
    },
  ];
}

function pulumiTsResources(infraId) {
  if (infraId === 'ecs-fargate') return `const cluster = new aws.ecs.Cluster(\`\${name}-cluster\`);\nexport const clusterArn = cluster.arn;`;
  if (infraId === 's3-cloudfront') return `const bucket = new aws.s3.Bucket(\`\${name}-site\`, { website: { indexDocument: "index.html" } });\nexport const bucketName = bucket.bucket;`;
  return `// Add your Pulumi resources here\n// e.g. const bucket = new aws.s3.Bucket(\`\${name}-bucket\`);`;
}

export const PULUMI_TS_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'Pulumi TypeScript infrastructure', infra: null };
export const PULUMI_TS_META = { id: 'pulumi-ts', label: 'Pulumi TypeScript', description: 'Pulumi v3 · TypeScript · AWS · devops/pulumi/', fileCount: 6 };
