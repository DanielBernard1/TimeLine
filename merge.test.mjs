// Verify per-section merge: each section takes the newer side; a device being
// "newer overall" cannot wipe a section another device edited more recently.
const SECTIONS = {
  timeline:  s => ({ monthCount: s.monthCount, events: s.events, ranges: s.ranges, cycle: s.cycle }),
  calendar:  s => ({ tasks: s.tasks }),
  categories:s => ({ categories: s.categories }),
  goals:     s => ({ goals: s.goals }),
  todos:     s => ({ todos: s.todos }),
  tasklist:  s => ({ tasklist: s.tasklist }),
};
function mergeStates(local, remote) {
  const lTimes = local.sectionTimes || {}, rTimes = (remote && remote.sectionTimes) || {};
  const lFallback = local.updatedAt || '', rFallback = (remote && remote.updatedAt) || '';
  const merged = JSON.parse(JSON.stringify(local));
  merged.sectionTimes = { ...lTimes };
  let changedLocal = false, changedRemote = false;
  for (const name of Object.keys(SECTIONS)) {
    const lt = lTimes[name] || lFallback;
    const rt = rTimes[name] || rFallback;
    if (remote && rt > lt) { Object.assign(merged, SECTIONS[name](remote)); merged.sectionTimes[name] = rt; changedLocal = true; }
    else if (lt > rt) { changedRemote = true; }
  }
  return { merged, changedLocal, changedRemote };
}

let pass=0,fail=0;
function eq(n,g,w){const ok=JSON.stringify(g)===JSON.stringify(w);console.log(`${ok?'PASS':'FAIL'}  ${n}${ok?'':`\n   got=${JSON.stringify(g)}\n  want=${JSON.stringify(w)}`}`);ok?pass++:fail++;}

// THE KEY CASE: cloud is newer overall (edited goals), but THIS device edited
// the task list more recently. Merge must keep the local task list AND take the
// cloud's goals — no wipe.
const local = {
  tasklist: [{ id:'uni', title:'Uni' }], goals: [],
  sectionTimes: { tasklist: '2026-11-25T10:00:00Z', goals: '2026-11-20T00:00:00Z' },
  updatedAt: '2026-11-25T10:00:00Z',
};
const remote = {
  tasklist: [], goals: [{ id:'g1', title:'old goal' }],
  sectionTimes: { tasklist: '2026-11-20T00:00:00Z', goals: '2026-11-24T00:00:00Z' },
  updatedAt: '2026-11-24T00:00:00Z',
};
const { merged, changedLocal, changedRemote } = mergeStates(local, remote);
eq('task list kept (local newer)', merged.tasklist, [{ id:'uni', title:'Uni' }]);
eq('goals taken from cloud (cloud newer)', merged.goals, [{ id:'g1', title:'old goal' }]);
eq('local changed (gained goals)', changedLocal, true);
eq('remote changed (needs our tasklist)', changedRemote, true);

// old cloud row with NO sectionTimes: falls back to updatedAt; local newer tasklist survives
const localB = { tasklist: [{id:'a'}], sectionTimes: { tasklist: '2026-11-25T00:00:00Z' }, updatedAt: '2026-11-25T00:00:00Z' };
const remoteB = { tasklist: [], updatedAt: '2026-11-10T00:00:00Z' }; // older blob, no sectionTimes
eq('tasklist survives vs old cloud row', mergeStates(localB, remoteB).merged.tasklist, [{id:'a'}]);

// identical -> no changes
const same = { goals:[], tasklist:[], sectionTimes:{goals:'t1',tasklist:'t1'}, updatedAt:'t1' };
const r = mergeStates(JSON.parse(JSON.stringify(same)), same);
eq('no change when equal', [r.changedLocal, r.changedRemote], [false, false]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
