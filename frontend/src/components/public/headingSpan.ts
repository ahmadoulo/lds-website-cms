/**
 * How many columns the section heading takes so the grid always closes on a
 * full row, at a given column count.
 *
 * The section used to put a centred heading above a three-column grid, which
 * left a wide empty band beside the title and, with five domains, an orphan
 * row of two underneath. Giving the heading a tile of the grid uses that band
 * and removes the orphan: at five domains 1 + 5 = 6 tiles, a clean 3x2.
 *
 * It is called once per breakpoint, because a span that balances a
 * three-column grid leaves the same orphan on a two-column one.
 *
 * It lives in its own file so the component module keeps exporting only a
 * component, which is what fast refresh needs.
 */
export function headingSpan(count: number, columns = 3): number {
  const remainder = count % columns;
  return remainder === 0 ? columns : columns - remainder;
}
