import { useState, useEffect, useMemo } from 'react';

// ── File icon map ─────────────────────────────────────────────────────────────
const EXT_ICONS = {
  py:         '🔵',
  yml:        '⚙️',
  yaml:       '⚙️',
  txt:        '📄',
  md:         '📝',
  ini:        '⚙️',
  cfg:        '⚙️',
  toml:       '⚙️',
  json:       '{}',
  js:         '🟨',
  ts:         '🟦',
  jsx:        '⚛️',
  tsx:        '⚛️',
  css:        '🎨',
  html:       '🌐',
  sh:         '📟',
  env:        '🔐',
  gitignore:  '🙈',
  Dockerfile: '🐳',
  default:    '📄',
};

function fileIcon(name) {
  if (name === 'Dockerfile' || name.startsWith('Dockerfile')) return '🐳';
  if (name.startsWith('.env'))     return '🔐';
  if (name === '.gitignore')       return '🙈';
  const ext = name.split('.').pop();
  return EXT_ICONS[ext] ?? EXT_ICONS.default;
}

// ── Build file tree from flat [{ path, content }] ────────────────────────────
function buildTree(files) {
  const root = {};

  files.forEach((file) => {
    const parts = file.path.split('/');
    let node = root;

    parts.forEach((part, i) => {
      if (!node[part]) {
        node[part] =
          i === parts.length - 1
            ? { _type: 'file', name: part, path: file.path, content: file.content }
            : { _type: 'dir',  name: part, path: parts.slice(0, i + 1).join('/'), _children: {} };
      }
      if (i < parts.length - 1) node = node[part]._children;
    });
  });

  // Recursively convert object → sorted array (dirs first)
  function toArray(obj) {
    return Object.values(obj)
      .map((n) => ({
        ...n,
        children: n._type === 'dir' ? toArray(n._children) : undefined,
        _children: undefined,
      }))
      .sort((a, b) => {
        if (a._type !== b._type) return a._type === 'dir' ? -1 : 1;
        // Keep dotfiles near the top
        const aName = a.name.startsWith('.') ? '!' + a.name : a.name;
        const bName = b.name.startsWith('.') ? '!' + b.name : b.name;
        return aName.localeCompare(bName);
      });
  }

  return toArray(root);
}

// ── FileTreeNode (recursive) ─────────────────────────────────────────────────
const FileTreeNode = ({ node, selectedPath, onSelect, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 2); // top two levels start open
  const indent = depth * 14 + 10;

  if (node._type === 'file') {
    const active = selectedPath === node.path;
    const isEmpty = !node.content;
    return (
      <button
        type="button"
        onClick={() => onSelect(node)}
        style={{ paddingLeft: indent }}
        className={`group flex w-full items-center gap-1.5 rounded py-[3px] pr-2 text-left
          text-[12px] transition-colors ${
            active
              ? 'bg-indigo-600 text-white'
              : 'text-slate-300 hover:bg-slate-700/60'
          }`}
      >
        <span className="text-[11px] flex-shrink-0">{fileIcon(node.name)}</span>
        <span className="truncate">{node.name}</span>
        {isEmpty && (
          <span className={`ml-auto text-[9px] ${active ? 'text-indigo-200' : 'text-slate-600'}`}>
            empty
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: indent - 6 }}
        className="flex w-full items-center gap-1.5 py-[3px] pr-2 text-left
          text-[12px] text-slate-400 hover:text-slate-200 transition-colors rounded"
      >
        <span className="text-[9px] w-3 text-center flex-shrink-0">
          {open ? '▾' : '▸'}
        </span>
        <span className="text-[11px] flex-shrink-0">📁</span>
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto text-[9px] text-slate-600 flex-shrink-0">
          {node.children.length}
        </span>
      </button>
      {open && node.children.map((child) => (
        <FileTreeNode
          key={child.path ?? child.name}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const TemplatePreview = ({ files, projectName, fillHeight = false, defaultPath = null }) => {
  const [selected, setSelected] = useState(null);
  const [copied, setCopied]     = useState(false);

  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-select: prefer defaultPath, fall back to first non-empty file
  useEffect(() => {
    if (defaultPath) {
      const target = files.find((f) => f.path === defaultPath);
      if (target) { setSelected(target); return; }
    }
    const first = files.find((f) => f.content && f.path !== 'apps/__init__.py');
    if (first) setSelected(first);
  }, [files, defaultPath]);

  const handleCopy = () => {
    if (!selected?.content) return;
    navigator.clipboard.writeText(selected.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="flex overflow-hidden rounded-xl border border-slate-700"
      style={{ height: fillHeight ? '100%' : 480 }}
    >
      {/* ── Left: file tree ──────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{ width: 220, background: '#1a1f2e' }}
      >
        {/* Tree header */}
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {projectName}
          </p>
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
            {files.length} files
          </span>
        </div>

        {/* Tree body */}
        <div className="flex-1 overflow-y-auto py-1.5 px-1">
          {tree.map((node) => (
            <FileTreeNode
              key={node.path ?? node.name}
              node={node}
              selectedPath={selected?.path}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* ── Right: code viewer ───────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
        {selected ? (
          <>
            {/* Toolbar */}
            <div
              className="flex flex-shrink-0 items-center justify-between px-4 py-2"
              style={{ background: '#1e2535', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* macOS-style dots */}
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="font-mono text-[11.5px] text-slate-400">{selected.path}</span>
              </div>

              <button
                onClick={handleCopy}
                disabled={!selected.content}
                className="text-[11px] font-semibold text-slate-400 hover:text-white
                  transition-colors disabled:opacity-30"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Code body */}
            <pre
              className="flex-1 overflow-auto p-4 font-mono text-[12px]
                leading-relaxed text-slate-200"
            >
              {selected.content || (
                <span className="text-slate-600 italic"># empty file</span>
              )}
            </pre>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-slate-600 text-sm">← Select a file to preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatePreview;
