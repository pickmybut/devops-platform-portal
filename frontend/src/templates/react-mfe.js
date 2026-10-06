/** React Micro-Frontend — Vite + Tailwind CSS */

export function buildReactMfeFiles({ projectName, appName, pascalName, description, config = {} }) {
  const reactVer = config.reactVersion ?? '19';
  const css      = config.css          ?? 'tailwind';

  const cssSetup = css === 'tailwind'
    ? `import './index.css'\n`
    : css === 'modules'
    ? `import styles from './App.module.css'\n`
    : '';

  const cssClass = css === 'tailwind'
    ? `className="min-h-screen flex items-center justify-center bg-slate-50"`
    : css === 'modules'
    ? `className={styles.app}`
    : ``;

  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: projectName,
        version: '1.0.0',
        description: description || '',
        type: 'module',
        scripts: {
          dev:     'vite',
          build:   'vite build',
          preview: 'vite preview',
          lint:    'eslint src',
          test:    'vitest',
        },
        dependencies: {
          react:     `^${reactVer}.0.0`,
          'react-dom': `^${reactVer}.0.0`,
        },
        devDependencies: {
          '@types/react':            `^${reactVer}.0.0`,
          '@types/react-dom':        `^${reactVer}.0.0`,
          '@vitejs/plugin-react':    '^4.3.4',
          'eslint':                  '^9.0.0',
          'vite':                    '^6.0.0',
          'vitest':                  '^2.0.0',
          '@testing-library/react':  '^16.0.0',
          '@testing-library/jest-dom': '^6.0.0',
          ...(css === 'tailwind' ? { tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' } : {}),
        },
      }, null, 2),
    },
    {
      path: 'vite.config.js',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
${css === 'tailwind' ? "import tailwindcss from '@tailwindcss/vite'\n" : ''}
export default defineConfig({
  plugins: [
    react(),
    ${css === 'tailwind' ? 'tailwindcss(),' : ''}
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pascalName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    },
    {
      path: 'src/main.jsx',
      content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
${cssSetup}import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
    },
    {
      path: 'src/App.jsx',
      content: `${css === 'modules' ? `import styles from './App.module.css'\n\n` : ''}/**
 * ${pascalName} root component.
 */
export default function App() {
  return (
    <div ${cssClass}>
      <div className="${css === 'tailwind' ? 'text-center' : ''}">
        <h1 className="${css === 'tailwind' ? 'text-3xl font-bold text-slate-800 mb-2' : ''}">${pascalName}</h1>
        <p className="${css === 'tailwind' ? 'text-slate-500' : ''}">${description || 'Your app starts here.'}</p>
      </div>
    </div>
  )
}
`,
    },
    css === 'tailwind' ? {
      path: 'src/index.css',
      content: `@import 'tailwindcss';\n`,
    } : css === 'modules' ? {
      path: 'src/App.module.css',
      content: `.app {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n`,
    } : null,
    {
      path: 'src/test-setup.js',
      content: `import '@testing-library/jest-dom'\n`,
    },
    {
      path: 'src/App.test.jsx',
      content: `import { render, screen } from '@testing-library/react'
import App from './App.jsx'

test('renders app heading', () => {
  render(<App />)
  expect(screen.getByRole('heading')).toBeInTheDocument()
})
`,
    },
    {
      path: '.gitignore',
      content: `node_modules/\ndist/\n.env\n*.log\n.DS_Store\ncoverage/\n`,
    },
    {
      path: 'README.md',
      content: `# ${pascalName}

${description || 'React micro-frontend built with Vite.'}

## Stack

React ${reactVer} · Vite · ${css === 'tailwind' ? 'Tailwind CSS v4' : css === 'modules' ? 'CSS Modules' : 'Plain CSS'} · Vitest

## Dev

\`\`\`bash
npm install
npm run dev    # → http://localhost:5173
npm test       # Vitest
npm run build  # → dist/
\`\`\`
`,
    },
  ].filter(Boolean);
}

export const REACT_MFE_PREVIEW_VARS = {
  projectName: 'my-react-mfe',
  appName:     'my_react_mfe',
  pascalName:  'MyReactMfe',
  description: 'React micro-frontend built with Vite',
  config:      { reactVersion: '19', css: 'tailwind' },
};

export const REACT_MFE_META = {
  id:          'react-mfe',
  label:       'React MFE',
  description: 'React 19 · Vite · Tailwind CSS v4 · Vitest',
  fileCount:   10,
};
