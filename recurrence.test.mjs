import { occurrencesBetween, expandItem } from './recurrence.mjs';

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n   got=${JSON.stringify(got)}\n  want=${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
}

// none
eq('none in window', occurrencesBetween({ date: '2026-11-30', repeat: 'none' }, '2026-11-01', '2026-12-31'), ['2026-11-30']);
eq('none outside window', occurrencesBetween({ date: '2026-11-30', repeat: 'none' }, '2027-01-01', '2027-12-31'), []);

// yearly birthday: appears once per year, clamps nothing for a normal date
eq('yearly birthday 3 years', occurrencesBetween({ date: '2026-12-15', repeat: 'yearly' }, '2026-01-01', '2028-12-31'),
  ['2026-12-15', '2027-12-15', '2028-12-15']);
// yearly starting before the window: only occurrences within window
eq('yearly windowed', occurrencesBetween({ date: '2020-03-10', repeat: 'yearly' }, '2027-01-01', '2028-12-31'),
  ['2027-03-10', '2028-03-10']);
// 29 Feb yearly clamps to 28 in non-leap years (2027 not leap, 2028 leap)
eq('yearly 29 Feb clamp', occurrencesBetween({ date: '2024-02-29', repeat: 'yearly' }, '2027-01-01', '2028-12-31'),
  ['2027-02-28', '2028-02-29']);

// weekly: every 7 days; window clipping; does not produce before base
eq('weekly 4 weeks', occurrencesBetween({ date: '2026-11-02', repeat: 'weekly' }, '2026-11-01', '2026-11-30'),
  ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
eq('weekly starts before window', occurrencesBetween({ date: '2026-11-02', repeat: 'weekly' }, '2026-11-15', '2026-11-30'),
  ['2026-11-16', '2026-11-23', '2026-11-30']);

// monthly: same day-of-month, clamps for short months (31st -> 28/30)
eq('monthly 31st clamps', occurrencesBetween({ date: '2027-01-31', repeat: 'monthly' }, '2027-01-01', '2027-04-30'),
  ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
eq('monthly from mid-window', occurrencesBetween({ date: '2026-11-10', repeat: 'monthly' }, '2027-01-01', '2027-03-31'),
  ['2027-01-10', '2027-02-10', '2027-03-10']);

// does not emit before the base date even if window opens earlier
eq('no occurrences before base', occurrencesBetween({ date: '2027-06-01', repeat: 'yearly' }, '2026-01-01', '2027-12-31'),
  ['2027-06-01']);

// expandItem keeps the period duration on each occurrence
const exp = expandItem({ startDate: '2026-12-20', endDate: '2026-12-27', repeat: 'yearly' }, '2026-01-01', '2027-12-31');
eq('period expand count', exp.length, 2);
eq('period occ1 start/end', [exp[0]._occStart, exp[0]._occEnd], ['2026-12-20', '2026-12-27']);
eq('period occ2 start/end (dur kept)', [exp[1]._occStart, exp[1]._occEnd], ['2027-12-20', '2027-12-27']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
