// Dropdown for picking several options at once. A long row of loose checkboxes
// broke the form grid alignment, so the choices live in a panel behind one
// input-sized control.
export default function MultiSelect({ label, options, selected, onToggle, emptyLabel = 'All' }) {
  // Normalised once so the summary and the checkboxes can never disagree, and
  // so number ids from the API still match string ids from form state.
  const chosenIds = new Set((Array.isArray(selected) ? selected : []).map(String))
  const chosen = options.filter((option) => chosenIds.has(String(option.id)))
  const summary = chosen.length === 0
    ? emptyLabel
    : chosen.length === 1 ? chosen[0].name : `${chosen.length} selected`

  return (
    <details className="multi-select">
      <summary aria-label={label}>
        <span>{summary}</span>
      </summary>
      <div className="multi-select-panel" role="group" aria-label={label}>
        {options.length === 0 ? (
          <p className="muted">No options available.</p>
        ) : options.map((option) => (
          <label className="checkbox-field" key={option.id}>
            <input type="checkbox" checked={chosenIds.has(String(option.id))}
              onChange={() => onToggle(String(option.id))} />
            {option.name}
          </label>
        ))}
      </div>
    </details>
  )
}
