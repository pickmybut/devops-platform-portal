import { useState } from 'react';
import { CI_CATEGORIES, CI_SNIPPETS } from '../data/ciSnippets';

// ── Code block ───────────────────────────────────────────────────────────────
const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/70" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <div className="h-3 w-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[10px] text-slate-400 font-mono">.gitlab-ci.yml</span>
        <button
          onClick={handleCopy}
          className="text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <pre
        className="overflow-x-auto bg-slate-900 p-4 text-[12.5px] leading-relaxed
          text-slate-200 font-mono"
        style={{ maxHeight: 400 }}
      >
        {code}
      </pre>
    </div>
  );
};

// ── Snippet card ─────────────────────────────────────────────────────────────
const SnippetCard = ({ snippet, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-xl border-2 p-4 text-left transition-all
      focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        active
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
      }`}
  >
    <p className={`text-[13px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>
      {snippet.name}
    </p>
    <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{snippet.description}</p>
  </button>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const CITemplatesPage = () => {
  const [activeCategory, setActiveCategory] = useState('build');
  const [activeSnippet, setActiveSnippet] = useState(null);

  const snippets = CI_SNIPPETS.filter((s) => s.category === activeCategory);

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setActiveSnippet(null);
  };

  const handleSnippetClick = (snippet) => {
    setActiveSnippet(snippet.id === activeSnippet?.id ? null : snippet);
  };

  return (
    <div className="flex gap-5 max-w-5xl" style={{ minHeight: 0 }}>
      {/* ── Category sidebar ───────────────────────────────────────── */}
      <aside className="w-44 flex-shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Categories
        </p>
        <div className="space-y-1">
          {CI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left
                text-[13px] transition-all ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 font-semibold text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Hint */}
        <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-100 p-3">
          <p className="text-[11px] text-indigo-600 font-semibold mb-1">💡 How to use</p>
          <p className="text-[11px] text-indigo-500 leading-relaxed">
            Pick a snippet, copy it, and paste it into your project&apos;s{' '}
            <code className="font-mono">.gitlab-ci.yml</code>.
          </p>
        </div>
      </aside>

      {/* ── Main panel ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Category heading */}
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-slate-800">
            {CI_CATEGORIES.find((c) => c.id === activeCategory)?.icon}{' '}
            {CI_CATEGORIES.find((c) => c.id === activeCategory)?.label} Jobs
          </h2>
          <p className="text-[12.5px] text-slate-400 mt-0.5">
            {snippets.length} snippet{snippets.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Two-column: snippet cards + code preview */}
        <div className={`grid gap-4 ${activeSnippet ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Snippet list */}
          <div className="space-y-2">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                active={activeSnippet?.id === snippet.id}
                onClick={() => handleSnippetClick(snippet)}
              />
            ))}
          </div>

          {/* Code preview */}
          {activeSnippet && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-slate-600">
                  {activeSnippet.name}
                </p>
                <button
                  onClick={() => setActiveSnippet(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
              <CodeBlock code={activeSnippet.code} />
            </div>
          )}
        </div>

        {/* Empty state */}
        {snippets.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="text-slate-400 text-sm">No snippets in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CITemplatesPage;
