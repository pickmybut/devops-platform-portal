/**
 * Clickable project template / option card.
 *
 * Props:
 *   template  – object with { id, name, icon, description, tags, accent, bg }
 *   selected  – boolean
 *   onSelect  – (template) => void
 *   compact   – boolean  renders a smaller card (for 4-col grids)
 */
const TemplateCard = ({ template, selected, onSelect, compact = false }) => (
  <button
    type="button"
    onClick={() => onSelect(template)}
    aria-pressed={selected}
    style={{
      borderColor: selected ? template.accent : '#e2e8f0',
      background: selected ? template.bg : '#fff',
    }}
    className={`w-full rounded-xl border-2 text-left transition-all
      focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
      hover:shadow-sm ${compact ? 'p-3' : 'p-4'}`}
  >
    {/* Icon */}
    <span
      className={`block leading-none ${compact ? 'text-xl mb-1.5' : 'text-2xl mb-2'}`}
      aria-hidden="true"
    >
      {template.icon}
    </span>

    {/* Name + selected badge */}
    <div className="flex items-start gap-1.5 flex-wrap">
      <span className={`font-semibold text-slate-800 leading-tight
        ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
        {template.name}
      </span>
      {selected && (
        <span
          style={{ background: template.bg, color: template.accent }}
          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0"
        >
          ✓
        </span>
      )}
    </div>

    {/* Description */}
    {!compact && (
      <p className="mt-1 text-[11.5px] leading-snug text-slate-500">
        {template.description}
      </p>
    )}

    {/* Tags — full cards only */}
    {!compact && template.tags?.length > 0 && (
      <div className="mt-2.5 flex flex-wrap gap-1">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]
              font-medium text-slate-500"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
  </button>
);

export default TemplateCard;
