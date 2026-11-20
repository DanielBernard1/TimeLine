// Recurrence engine for the Timeline/Calendar app — standalone + testable.
// An item with a recurrence rule produces occurrences on dates. Rules:
//   'none'    -> single occurrence on the base date
//   'weekly'  -> every 7 days from the base date
//   'monthly' -> same day-of-month each month (clamped to month length)
//   'yearly'  -> same day/month each year (29 Feb clamps to 28 in non-leap years)
// Occurrences are generated lazily within a [from, to] window (inclusive),
// never stored. Deleting removes the whole series; editing changes the series.
// Used by both views: the calendar generates occurrences up to its horizon;
// the timeline asks only for occurrences that fall inside its added months.

export function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
export function toISO(dt) { const p = n => String(n).padStart(2,'0');
  return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`; }
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// For a period item (start/end), recurrence shifts the START; the END keeps the
// same duration (in days) as the base occurrence.
function durationDays(startISO, endISO) {
  if (!endISO) return 0;
  return Math.round((parseISO(endISO) - parseISO(startISO)) / 86400000);
}

// Generate occurrence start-dates (ISO strings) for one item within [fromISO, toISO].
export function occurrencesBetween(item, fromISO, toISO_) {
  const rule = item.repeat || 'none';
  const base = parseISO(item.date || item.startDate);
  const from = parseISO(fromISO), to = parseISO(toISO_);
  const out = [];

  if (rule === 'none') {
    if (base >= from && base <= to) out.push(toISO(base));
    return out;
  }

  if (rule === 'weekly') {
    // first occurrence on/after `from` that is congruent to base mod 7 days
    let d = new Date(base);
    if (d < from) {
      const diff = Math.ceil((from - d) / 86400000 / 7);
      d = new Date(base); d.setDate(d.getDate() + diff * 7);
    }
    for (; d <= to; d.setDate(d.getDate() + 7)) if (d >= base) out.push(toISO(startOfDay(d)));
    return out;
  }

  if (rule === 'monthly') {
    const dom = base.getDate();
    // iterate month by month from max(base month, from month)
    let y = Math.max(base.getFullYear(), from.getFullYear());
    let m = (y === base.getFullYear()) ? base.getMonth() : 0;
    if (y === from.getFullYear() && from.getMonth() > m) m = from.getMonth();
    let cur = new Date(y, m, 1);
    const baseMonthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    if (cur < baseMonthStart) cur = baseMonthStart;
    for (; cur <= to; cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)) {
      const clampedDay = Math.min(dom, daysInMonth(cur.getFullYear(), cur.getMonth()));
      const occ = new Date(cur.getFullYear(), cur.getMonth(), clampedDay);
      if (occ >= base && occ >= from && occ <= to) out.push(toISO(occ));
    }
    return out;
  }

  if (rule === 'yearly') {
    const mo = base.getMonth(), dom = base.getDate();
    for (let y = Math.max(base.getFullYear(), from.getFullYear()); ; y++) {
      const clampedDay = Math.min(dom, daysInMonth(y, mo));
      const occ = new Date(y, mo, clampedDay);
      if (occ > to) break;
      if (occ >= base && occ >= from) out.push(toISO(occ));
    }
    return out;
  }

  return out;
}

// Expand an item into concrete occurrences (with start/end ISO for periods).
export function expandItem(item, fromISO, toISO_) {
  const dur = durationDays(item.date || item.startDate, item.endDate);
  return occurrencesBetween(item, fromISO, toISO_).map(startISO => {
    const start = parseISO(startISO);
    const end = new Date(start); end.setDate(end.getDate() + dur);
    return { ...item, _occStart: startISO, _occEnd: toISO(end) };
  });
}

export { daysInMonth, durationDays };
