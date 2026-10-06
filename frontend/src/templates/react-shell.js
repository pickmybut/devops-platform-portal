/** React Shell App — Vite + React Router Dom + Tailwind CSS */

export function buildReactShellFiles({ projectName, appName, pascalName, description, config = {} }) {
  const reactVer = config.reactVersion ?? '19';
  const css      = config.css          ?? 'tailwind';

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
          react:            `^${reactVer}.0.0`,
          'react-dom':      `^${reactVer}.0.0`,
          'react-router-dom': '^7.0.0',
        },
        devDependencies: {
          '@types/react':           `^${reactVer}.0.0`,
          '@types/react-dom':       `^${reactVer}.0.0`,
          '@vitejs/plugin-react':   '^4.3.4',
          'eslint':                 '^9.0.0',
          'vite':                   '^6.0.0',
          'vitest':                 '^2.0.0',
          '@testing-library/react': '^16.0.0',
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
  plugins: [react(), ${css === 'tailwind' ? 'tailwindcss()' : ''}],
  test: { globals: true, environment: 'jsdom', setupFiles: './src/test-setup.js' },
})
`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${pascalName}</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
`,
    },
    {
      path: 'src/main.jsx',
      content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
${css === 'tailwind' ? "import './index.css'\n" : ''}import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
`,
    },
    {
      path: 'src/App.jsx',
      content: `import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <div className="${css === 'tailwind' ? 'min-h-screen bg-slate-50' : ''}">
      <nav className="${css === 'tailwind' ? 'border-b border-slate-200 bg-white px-6 py-3 flex gap-4' : ''}">
        <Link to="/" className="${css === 'tailwind' ? 'text-indigo-600 font-semibold hover:text-indigo-800' : ''}">${pascalName}</Link>
      </nav>
      <main className="${css === 'tailwind' ? 'p-6' : ''}">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
`,
    },
    {
      path: 'src/pages/Home.jsx',
      content: `export default function Home() {
  return (
    <div>
      <h1 className="${css === 'tailwind' ? 'text-2xl font-bold text-slate-800 mb-2' : ''}">${pascalName}</h1>
      <p className="${css === 'tailwind' ? 'text-slate-500' : ''}">${description || 'Your shell application.'}</p>
    </div>
  )
}
`,
    },
    {
      path: 'src/pages/NotFound.jsx',
      content: `export default function NotFound() {
  return <div><h2>404 — Page not found</h2></div>
}
`,
    },
    css === 'tailwind' ? { path: 'src/index.css', content: `@import 'tailwindcss';\n` } : null,
    { path: 'src/test-setup.js', content: `import '@testing-library/jest-dom'\n` },
    {
      path: '.gitignore',
      content: `node_modules/\ndist/\n.env\n*.log\n.DS_Store\ncoverage/\n`,
    },
    {
      path: 'README.md',
      content: `# ${pascalName}

${description || 'React shell application.'}

## Stack

React ${reactVer} · Vite · React Router v7 · ${css === 'tailwind' ? 'Tailwind CSS v4' : 'CSS Modules'}

## Dev

\`\`\`bash
npm install
npm run dev    # → http://localhost:5173
npm run build
\`\`\`
`,
    },
  ].filter(Boolean);
}

export const REACT_SHELL_PREVIEW_VARS = {
  projectName: 'my-react-shell',
  appName:     'my_react_shell',
  pascalName:  'MyReactShell',
  description: 'React shell application with React Router',
  config:      { reactVersion: '19', css: 'tailwind' },
};

export const REACT_SHELL_META = {
  id:          'react-shell',
  label:       'React Shell',
  description: 'React 19 · Vite · React Router v7 · Tailwind CSS v4',
  fileCount:   11,
};
