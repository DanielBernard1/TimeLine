// Standalone self-check of the prototype's core logic (no DOM).
// Mirrors the functions in timeline.html to catch math bugs before the user opens it.

const FIRST_YEAR = 2026, FIRST_MONTH = 10; // November
const MONTH_W = 320;
const TODAY = new Date(2026, 10, 20);

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
function monthOfIndex(i) {
  const total = FIRST_MONTH + i;
  return { year: FIRST_YEAR + Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}
function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }

function dateToX(iso, monthCount) {
  const dt = parseISO(iso);
  for (let i = 0; i < monthCount; i++) {
    const { year, month } = monthOfIndex(i);
    if (year === dt.getFullYear() && month === dt.getMonth()) {
      const dim = daysInMonth(year, month);
      return i * MONTH_W + ((dt.getDate() - 1) / dim) * MONTH_W;
    }
  }
  return null;
}

function assignRangeSlots(ranges, monthCount) {
  const items = ranges.map(r => ({ r, a: dateToX(r.startDate, monthCount), b: dateToX(r.endDate, monthCount) }))
                      .filter(o => o.a !== null && o.b !== null)
                      .sort((p,q) => p.a - q.a);
  const slotEnds = [];
  for (const o of items) {
    let s = slotEnds.findIndex(end => end <= o.a);
    if (s === -1) { s = slotEnds.length; slotEnds.push(o.b); } else slotEnds[s] = o.b;
    o.slot = s;
  }
  return { items, maxSlots: Math.max(1, slotEnds.length) };
}

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}${ok ? '' : ' want=' + JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}

// month derivation: index 0 = Nov 2026, should roll into 2027
eq('month[0] = Nov 2026', monthOfIndex(0), { year: 2026, month: 10 });
eq('month[1] = Dez 2026', monthOfIndex(1), { year: 2026, month: 11 });
eq('month[2] = Jan 2027', monthOfIndex(2), { year: 2027, month: 0 });
eq('month[4] = Mär 2027', monthOfIndex(4), { year: 2027, month: 2 });
eq('month[14] = Jan 2028', monthOfIndex(14), { year: 2028, month: 0 });

// dateToX: first day of Nov is at x=0; within-month fraction correct; out-of-range null
eq('1 Nov 2026 -> x=0', dateToX('2026-11-01', 5), 0);
eq('30 Nov 2026 fraction', Math.round(dateToX('2026-11-30', 5)), Math.round(29/30 * MONTH_W));
eq('1 Dez 2026 -> x=MONTH_W', dateToX('2026-12-01', 5), MONTH_W);
eq('13 Jan 2027 in block 2', Math.round(dateToX('2027-01-13', 5)), Math.round(2*MONTH_W + 12/31*MONTH_W));
eq('before start -> null', dateToX('2026-10-15', 5), null);
eq('beyond last month -> null', dateToX('2027-05-01', 5), null);

// graying predicates
eq('event 30 Nov is past (before 20 Nov? no)', parseISO('2026-11-30') < TODAY, false);
eq('event 7 Dec... actually 7 Nov is past', parseISO('2026-11-07') < TODAY, true);
eq('range ending 10 Jan not past', parseISO('2027-01-10') < TODAY, false);
eq('range ending 10 Nov is past', parseISO('2026-11-10') < TODAY, true);

// overlap stacking: two overlapping ranges -> 2 slots, assigned 0 and 1
const r = assignRangeSlots([
  { startDate: '2026-12-20', endDate: '2027-01-10' },
  { startDate: '2027-01-05', endDate: '2027-02-15' },
], 5);
eq('overlap maxSlots = 2', r.maxSlots, 2);
eq('overlap slots = [0,1]', r.items.map(i => i.slot), [0, 1]);

// non-overlapping ranges reuse slot 0
const r2 = assignRangeSlots([
  { startDate: '2026-11-01', endDate: '2026-11-10' },
  { startDate: '2026-12-01', endDate: '2026-12-10' },
], 5);
eq('non-overlap maxSlots = 1', r2.maxSlots, 1);
eq('non-overlap slots = [0,0]', r2.items.map(i => i.slot), [0, 0]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
