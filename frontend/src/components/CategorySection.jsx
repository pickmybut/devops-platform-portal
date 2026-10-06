/**
 * Labelled section wrapper used for each template category on the create form.
 *
 * Props:
 *   step        – step number badge
 *   label       – section heading
 *   icon        – emoji icon
 *   description – sub-heading text
 *   required    – shows red * on label
 *   active      – true when this section is driving the right-panel preview
 *   onActivate  – called when the user clicks the header (switches the preview)
 *   error       – validation error string
 *   children    – form content
 */
const CategorySection = ({
  step, label, icon, description, required,
  active, onActivate,
  error, children,
}) => (
  <div>
    {/* ── Header ──────────────────────────────────────────────────────────── */}
    <button
      type="button"
      onClick={onActivate}
      className={`group mb-3 flex w-full items-start gap-3 rounded-lg px-1 py-1 text-left
        transition-colors ${onActivate ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
    >
      {/* Step badge */}
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center
          rounded-full text-[12px] font-bold transition-colors ${
            active
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
          }`}
      >
        {step}
      </div>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <h3 className={`text-[14px] font-bold transition-colors ${
            active ? 'text-indigo-700' : 'text-slate-800'
          }`}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </h3>
          {active && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px]
              font-semibold text-indigo-600">
              previewing
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-slate-400">{description}</p>
      </div>
    </button>

    {/* ── Content slot ────────────────────────────────────────────────────── */}
    {children}

    {/* ── Validation error ────────────────────────────────────────────────── */}
    {error && (
      <p className="mt-2 text-[12px] font-medium text-red-500">{error}</p>
    )}
  </div>
);

export default CategorySection;
