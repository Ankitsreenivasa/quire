/**
 * Parse a page-range string like "1-3, 5, 8-10" into a sorted, de-duplicated
 * list of 1-based page numbers clamped to [1, total].
 */
export function parsePageRange(spec: string, total: number): number[] {
  const set = new Set<number>()
  for (const raw of spec.split(',')) {
    const part = raw.trim()
    if (!part) continue
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      let a = parseInt(m[1], 10)
      let b = parseInt(m[2], 10)
      if (a > b) [a, b] = [b, a]
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i)
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10)
      if (n >= 1 && n <= total) set.add(n)
    }
  }
  return [...set].sort((x, y) => x - y)
}

/** Split a spec on ";" into groups of ranges, used by Split PDF's "custom ranges". */
export function parseRangeGroups(spec: string, total: number): number[][] {
  return spec
    .split(';')
    .map((g) => parsePageRange(g, total))
    .filter((g) => g.length > 0)
}
