// Category grouping shared by the public price board and the dashboard service
// list, so the owner sees exactly the order customers see.

export const OTHER_CATEGORY = 'Other'

const key = (value) => String(value || '').trim() || OTHER_CATEGORY

/**
 * Groups services under their category name.
 * Ordering: categories named in `categoryOrder` first, in that order, then any
 * remaining categories alphabetically, with "Other" always last.
 * @returns {Array<[string, object[]]>}
 */
export function groupServicesByCategory(services = [], categoryOrder = []) {
  const groups = new Map()
  for (const service of services) {
    const name = key(service.category)
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(service)
  }

  const ordered = []
  for (const preferred of categoryOrder) {
    const match = [...groups.keys()]
      .find((name) => name.toLowerCase() === String(preferred).trim().toLowerCase())
    if (match) {
      ordered.push([match, groups.get(match)])
      groups.delete(match)
    }
  }

  const other = groups.has(OTHER_CATEGORY) ? [[OTHER_CATEGORY, groups.get(OTHER_CATEGORY)]] : []
  groups.delete(OTHER_CATEGORY)
  const rest = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  return [...ordered, ...rest, ...other]
}

/** Every category currently in use, already in price-list order. */
export function categoryNames(services = [], categoryOrder = []) {
  return groupServicesByCategory(services, categoryOrder).map(([name]) => name)
}
