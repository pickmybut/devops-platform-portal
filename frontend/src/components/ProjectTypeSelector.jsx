import TemplateCard from './TemplateCard';
import { PROJECT_TYPES } from '../data/templateCategories';

// ── Individual config field ───────────────────────────────────────────────────
const ConfigField = ({ option, value, onChange }) => {
  const current = value ?? option.default;

  if (option.type === 'radio') {
    return (
      <div>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
          {option.label}
        </p>
        <div className="space-y-1.5">
          {option.choices.map((choice) => {
            const active = current === choice.value;
            return (
              <label
                key={choice.value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border
                  px-3 py-2 transition-colors ${
                    active
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <input
                  type="radio"
                  name={option.id}
                  value={choice.value}
                  checked={active}
                  onChange={() => onChange(choice.value)}
                  className="accent-indigo-600 flex-shrink-0"
                />
                {choice.icon && (
                  <span className="text-sm leading-none">{choice.icon}</span>
                )}
                <span className="flex-1 text-[12.5px] font-medium text-slate-700">
                  {choice.label}
                </span>
                {choice.badge && (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px]
                    font-bold text-indigo-600">
                    {choice.badge}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // type: 'select'
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
        {option.label}
      </p>
      <div className="relative">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white
            px-3 py-2 pr-7 text-[13px] text-slate-700 outline-none transition
            focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
        >
          {option.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}{choice.badge ? ` (${choice.badge})` : ''}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2
          -translate-y-1/2 text-[10px] text-slate-400">▾</span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
/**
 * ProjectTypeSelector
 *
 * Collapsed state  — shows all 12 template cards in a 3-col grid.
 * Expanded state   — selected card becomes a full-width hero with config fields;
 *                    all others shrink to a pill row at the bottom.
 */
const ProjectTypeSelector = ({ selected, onSelect, config, onConfigChange, onActivate, error }) => {
  // ── No selection yet → full grid ─────────────────────────────────────────
  if (!selected) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {PROJECT_TYPES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={false}
            compact
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // ── Selected → expanded card + pill row ──────────────────────────────────
  const others = PROJECT_TYPES.filter((t) => t.id !== selected.id);
  const options = selected.configOptions ?? [];

  return (
    <div className="space-y-3">
      {/* Expanded selected card */}
      <div
        className="rounded-xl border-2 p-4"
        style={{ borderColor: selected.accent, background: selected.bg }}
        onClick={onActivate}
      >
        {/* Header: icon + name + description + deselect */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer">
            <span className="text-2xl leading-none">{selected.icon}</span>
            <div>
              <p className="text-[14px] font-bold text-slate-800">{selected.name}</p>
              <p className="text-[11.5px] text-slate-500">{selected.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/70 px-1.5 py-0.5 text-[10px]
                      font-medium text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(null); }}
            aria-label="Deselect template"
            className="flex-shrink-0 rounded-full p-1 text-slate-400
              hover:bg-white/60 hover:text-slate-600 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Config fields — stop propagation so clicking a field doesn't re-fire onActivate */}
        {options.length > 0 && (
          <>
            <div
              className="my-3.5 h-px"
              style={{ background: selected.accent + '33' }}
            />
            <div
              className={`grid gap-4 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {options.map((opt) => (
                <ConfigField
                  key={opt.id}
                  option={opt}
                  value={config[opt.id]}
                  onChange={(val) => onConfigChange(opt.id, val)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Others — pill row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400 mr-0.5">or try:</span>
        {others.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200
              bg-white px-2.5 py-1 text-[11.5px] text-slate-600 transition-colors
              hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <span className="leading-none">{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>

      {/* Validation error */}
      {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default ProjectTypeSelector;
