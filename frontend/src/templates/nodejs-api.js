/** Node.js API — Express or Fastify, Dockerfile, Jest */

export function buildNodejsApiFiles({ projectName, appName, pascalName, description, config = {} }) {
  const nodeVer   = config.nodeVersion ?? '26';
  const framework = config.framework   ?? 'express';
  const db        = config.database    ?? 'none';

  const isExpress = framework === 'express';

  const deps = {
    ...(isExpress
      ? { express: '^4.21.0', helmet: '^8.0.0', cors: '^2.8.5' }
      : { fastify: '^5.0.0', '@fastify/cors': '^10.0.0', '@fastify/helmet': '^13.0.0' }),
    ...(db === 'postgresql' ? { pg: '^8.13.0' } : {}),
    ...(db === 'mongodb'    ? { mongoose: '^8.8.0' } : {}),
    dotenv: '^16.4.7',
  };

  const mainFile = isExpress
    ? `import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { healthRouter } from './routes/health.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)

app.get('/', (_req, res) => res.json({ service: '${projectName}', status: 'ok' }))

app.listen(PORT, () => {
  console.log(\`${pascalName} listening on :$\{PORT}\`)
})

export default app
`
    : `import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

const app = Fastify({ logger: true })
const PORT = Number(process.env.PORT ?? 3000)

await app.register(cors)
await app.register(helmet)

app.get('/', async () => ({ service: '${projectName}', status: 'ok' }))
app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})

export default app
`;

  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: projectName,
        version: '1.0.0',
        description: description || '',
        type: 'module',
        main: 'src/app.js',
        scripts: {
          start:     'node src/app.js',
          dev:       'node --watch src/app.js',
          test:      'node --experimental-vm-modules node_modules/.bin/jest',
        },
        dependencies: deps,
        devDependencies: {
          jest: '^29.7.0',
          supertest: '^7.0.0',
          '@jest/globals': '^29.7.0',
        },
      }, null, 2),
    },
    { path: 'src/app.js', content: mainFile },
    ...(isExpress ? [{
      path: 'src/routes/health.js',
      content: `import { Router } from 'express'
export const healthRouter = Router()
healthRouter.get('/', (_req, res) => res.json({ status: 'ok' }))
`,
    }] : []),
    {
      path: 'src/tests/health.test.js',
      content: isExpress
        ? `import { jest } from '@jest/globals'
import request from 'supertest'
import app from '../app.js'

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
`
        : `import { jest } from '@jest/globals'
import app from '../app.js'

describe('GET /health', () => {
  afterAll(() => app.close())
  it('returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('ok')
  })
})
`,
    },
    {
      path: 'Dockerfile',
      content: `FROM node:${nodeVer}-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci --omit=dev

FROM node:${nodeVer}-alpine AS runtime
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY src ./src
EXPOSE 3000
CMD ["node", "src/app.js"]
`,
    },
    { path: '.gitignore', content: `node_modules/\n.env\n*.log\n.DS_Store\ncoverage/\n` },
    {
      path: 'README.md',
      content: `# ${pascalName}\n\n${description || 'Node.js API.'}\n\n## Stack\n\nNode ${nodeVer} · ${isExpress ? 'Express' : 'Fastify'}${db !== 'none' ? ' · ' + db : ''} · Docker\n\n## Dev\n\n\`\`\`bash\nnpm install\nnpm run dev   # → http://localhost:3000\nnpm test\n\`\`\`\n`,
    },
  ];
}

export const NODEJS_API_PREVIEW_VARS = { projectName: 'my-node-api', appName: 'my_node_api', pascalName: 'MyNodeApi', description: 'Node.js REST API', config: { nodeVersion: '26', framework: 'express', database: 'none' } };
export const NODEJS_API_META = { id: 'nodejs-api', label: 'Node.js API', description: 'Node 26 · Express/Fastify · Jest · Docker', fileCount: 7 };
