// Verify the NuvaRing cycle math: from a start date, 21 days "in" then 7 days "out",
// repeating every 28 days, open-ended. We compute, for a given [from,to] window,
// the list of {phase:'in'|'out', start, end} segments (ISO, inclusive day ranges)
// clipped to the window. Mirrors the logic that will go into index.html.

function parseISO(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function toISO(dt){const p=n=>String(n).padStart(2,'0');return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`;}
function addDays(dt,n){const d=new Date(dt);d.setDate(d.getDate()+n);return d;}
const DAY=86400000;
const IN_DAYS=21, OUT_DAYS=7, CYCLE=IN_DAYS+OUT_DAYS;

// Segments (each a contiguous phase block) overlapping [fromISO,toISO], clipped.
// A cycle k starts at start + k*28 days: days [0,20] in, [21,27] out.
function cycleSegments(startISO, fromISO, toISO_){
  const start=parseISO(startISO), from=parseISO(fromISO), to=parseISO(toISO_);
  if (to < start) return [];
  const out=[];
  // which cycle index covers `from`? (never negative — nothing before start)
  const dFrom=Math.max(0, Math.floor((from-start)/DAY));
  let k=Math.floor(dFrom/CYCLE);
  while(true){
    const cycleStart=addDays(start, k*CYCLE);
    if (cycleStart>to) break;
    // in-phase: [cycleStart, cycleStart+20]; out-phase: [+21, +27]
    const inStart=cycleStart, inEnd=addDays(cycleStart, IN_DAYS-1);
    const outStart=addDays(cycleStart, IN_DAYS), outEnd=addDays(cycleStart, CYCLE-1);
    for(const seg of [{phase:'in',s:inStart,e:inEnd},{phase:'out',s:outStart,e:outEnd}]){
      // clip to [max(from,start), to]
      const lo=new Date(Math.max(seg.s, from, start));
      const hi=new Date(Math.min(seg.e, to));
      if(lo<=hi) out.push({phase:seg.phase,start:toISO(lo),end:toISO(hi)});
    }
    k++;
  }
  return out;
}

let pass=0,fail=0;
function eq(name,got,want){const ok=JSON.stringify(got)===JSON.stringify(want);
  console.log(`${ok?'PASS':'FAIL'}  ${name}${ok?'':`\n   got=${JSON.stringify(got)}\n  want=${JSON.stringify(want)}`}`);ok?pass++:fail++;}

// One full cycle starting 2026-11-01: in 01..21, out 22..28, next in starts 29.
eq('cycle 1 in-phase', cycleSegments('2026-11-01','2026-11-01','2026-11-21'),
  [{phase:'in',start:'2026-11-01',end:'2026-11-21'}]);
eq('cycle 1 out-phase boundary', cycleSegments('2026-11-01','2026-11-22','2026-11-28'),
  [{phase:'out',start:'2026-11-22',end:'2026-11-28'}]);
eq('next cycle starts day 29', cycleSegments('2026-11-01','2026-11-29','2026-11-29'),
  [{phase:'in',start:'2026-11-29',end:'2026-11-29'}]);

// Full window across 2 cycles (56 days): 4 segments, alternating.
const two = cycleSegments('2026-11-01','2026-11-01','2026-12-26'); // 56 days -> 2 full cycles
eq('two cycles -> 4 segments', two.map(s=>s.phase), ['in','out','in','out']);
eq('cycle2 in starts 29 Nov', two[2].start, '2026-11-29');
eq('cycle2 in ends 19 Dec', two[2].end, '2026-12-19'); // 29 Nov + 20 days
eq('cycle2 out 20..26 Dec', [two[3].start,two[3].end], ['2026-12-20','2026-12-26']);

// Nothing before the start date.
eq('no segments before start', cycleSegments('2027-01-10','2026-11-01','2027-01-09'), []);
eq('starts exactly at window end', cycleSegments('2027-01-10','2026-11-01','2027-01-10'),
  [{phase:'in',start:'2027-01-10',end:'2027-01-10'}]);

// Window opening mid-out-phase clips correctly.
eq('window mid out-phase', cycleSegments('2026-11-01','2026-11-25','2026-11-30'),
  [{phase:'out',start:'2026-11-25',end:'2026-11-28'},{phase:'in',start:'2026-11-29',end:'2026-11-30'}]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
