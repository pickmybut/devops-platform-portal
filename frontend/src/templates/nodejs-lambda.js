/** Node.js Lambda — handler, Jest, package.json */

export function buildNodejsLambdaFiles({ projectName, appName, description, config = {} }) {
  const nodeVer = config.nodeVersion ?? '26';
  const trigger = config.trigger     ?? 'api-gateway';

  const isApiGw    = trigger === 'api-gateway';
  const isSqs      = trigger === 'sqs';
  const returnBody = isApiGw
    ? `  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hello from ${projectName}' }) }`
    : `  return { status: 'ok', processed: (event.Records ?? [event]).length }`;

  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: projectName,
        version: '1.0.0',
        description: description || '',
        type: 'commonjs',
        main: 'handler.js',
        scripts: { test: 'jest' },
        devDependencies: { jest: '^29.7.0' },
      }, null, 2),
    },
    {
      path: 'handler.js',
      content: `'use strict';
// ${projectName} Lambda handler
// Trigger: ${trigger}

exports.lambdaHandler = async (event, context) => {
  console.log('Event:', JSON.stringify(event));
${returnBody}
};
`,
    },
    {
      path: 'tests/handler.test.js',
      content: `const { lambdaHandler } = require('../handler')

${isApiGw ? `test('returns 200', async () => {
  const event = { httpMethod: 'GET', path: '/' }
  const result = await lambdaHandler(event, {})
  expect(result.statusCode).toBe(200)
})` : `test('processes records', async () => {
  const event = { Records: [{ body: 'test' }] }
  const result = await lambdaHandler(event, {})
  expect(result.status).toBe('ok')
  expect(result.processed).toBe(1)
})`}
`,
    },
    { path: '.gitignore', content: `node_modules/\n.env\n*.log\n.DS_Store\nfunction.zip\ncoverage/\n` },
    {
      path: 'README.md',
      content: `# ${projectName}\n\n${description || 'Node.js Lambda function.'}\n\nNode ${nodeVer} · Trigger: ${trigger}\n\n## Test\n\n\`\`\`bash\nnpm install && npm test\n\`\`\`\n`,
    },
  ];
}

export const NODEJS_LAMBDA_PREVIEW_VARS = { projectName: 'my-node-lambda', appName: 'my_node_lambda', pascalName: 'MyNodeLambda', description: 'Node.js Lambda', config: { nodeVersion: '26', trigger: 'api-gateway' } };
export const NODEJS_LAMBDA_META = { id: 'nodejs-lambda', label: 'Node.js Lambda', description: 'Node 26 · AWS Lambda · Jest', fileCount: 5 };
