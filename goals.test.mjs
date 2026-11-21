// Verify goal scoring + chart series logic (mirrors what goes into index.html).
// A goal: { id, title, group:'short'|'long', endDate?:ISO, done?, notes,
//           status:'active'|'hit'|'missed', resolvedOn?:ISO }
// Resolution rules:
//  - hit:  user checks done -> status 'hit', resolvedOn = today (date checked)
//  - miss (timed): endDate < today and not done -> status 'missed', resolvedOn = endDate (auto)
//  - miss (untimed): user marks missed -> status 'missed', resolvedOn = today
//  - "try again": missed -> active again (removes its -1 from the series)
// Chart: cumulative score over time; hit=+1, miss=-1, point at resolvedOn, sorted by date.

function parseISO(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}

// Apply auto-miss to timed, still-active, past-due goals. Returns number changed.
function applyAutoMiss(goals, todayISO){
  const today = parseISO(todayISO); let n=0;
  for(const g of goals){
    if(g.status==='active' && !g.done && g.endDate && parseISO(g.endDate) < today){
      g.status='missed'; g.resolvedOn=g.endDate; n++;
    }
  }
  return n;
}

// Build the cumulative-score series — ONE point PER DAY (net), sorted by date.
// Each day's point carries the running cumulative score through end of that day,
// plus that day's hit/miss counts and net delta.
function scoreSeries(goals){
  const resolved = goals.filter(g=>g.status==='hit'||g.status==='missed')
    .slice().sort((a,b)=> a.resolvedOn<b.resolvedOn?-1:a.resolvedOn>b.resolvedOn?1:0);
  // aggregate per day
  const byDay = new Map(); // iso -> {hits, misses}
  for(const g of resolved){
    if(!byDay.has(g.resolvedOn)) byDay.set(g.resolvedOn, {hits:0, misses:0});
    const d = byDay.get(g.resolvedOn);
    if(g.status==='hit') d.hits++; else d.misses++;
  }
  const days = [...byDay.keys()].sort();
  let cum=0; const pts=[];
  for(const iso of days){
    const {hits, misses} = byDay.get(iso);
    const net = hits - misses;
    cum += net;
    pts.push({date:iso, score:cum, hits, misses, net});
  }
  return pts;
}
function stats(goals){
  const resolved = goals.filter(g=>g.status==='hit'||g.status==='missed');
  const hits = resolved.filter(g=>g.status==='hit').length;
  return { total: resolved.length, hits, misses: resolved.length-hits,
    successPct: resolved.length? Math.round(hits/resolved.length*100) : 0 };
}

let pass=0,fail=0;
function eq(name,got,want){const ok=JSON.stringify(got)===JSON.stringify(want);
  console.log(`${ok?'PASS':'FAIL'}  ${name}${ok?'':`\n   got=${JSON.stringify(got)}\n  want=${JSON.stringify(want)}`}`);ok?pass++:fail++;}

// auto-miss
let g1=[
  {id:'a',status:'active',done:false,endDate:'2026-11-10'}, // past due -> miss
  {id:'b',status:'active',done:false,endDate:'2026-12-31'}, // future -> stays
  {id:'c',status:'active',done:true, endDate:'2026-11-10'}, // done -> not missed
  {id:'d',status:'active',done:false},                      // untimed -> stays
];
eq('auto-miss count', applyAutoMiss(g1,'2026-11-20'), 1);
eq('a missed on endDate', [g1[0].status,g1[0].resolvedOn], ['missed','2026-11-10']);
eq('b still active', g1[1].status, 'active');
eq('c not missed', g1[2].status, 'active');
eq('d untimed still active', g1[3].status, 'active');

// series: ordered by resolvedOn, cumulative
const g2=[
  {status:'hit', resolvedOn:'2026-11-05'},
  {status:'missed', resolvedOn:'2026-11-12'},
  {status:'hit', resolvedOn:'2026-11-20'},
  {status:'hit', resolvedOn:'2026-11-22'},
  {status:'active'}, // ignored
];
eq('series scores', scoreSeries(g2).map(p=>p.score), [1,0,1,2]);
eq('series dates sorted', scoreSeries(g2).map(p=>p.date), ['2026-11-05','2026-11-12','2026-11-20','2026-11-22']);

// multiple resolutions on the SAME day collapse to one net point
const gSameDay=[
  {status:'hit', resolvedOn:'2026-11-10'},
  {status:'hit', resolvedOn:'2026-11-10'},
  {status:'missed', resolvedOn:'2026-11-10'},  // day net: +2-1 = +1
  {status:'missed', resolvedOn:'2026-11-12'},  // -1 -> cum 0
];
eq('same-day collapses to one point/day', scoreSeries(gSameDay).map(p=>p.date),
  ['2026-11-10','2026-11-12']);
eq('same-day net cumulative', scoreSeries(gSameDay).map(p=>p.score), [1, 0]);
eq('same-day counts', scoreSeries(gSameDay)[0], {date:'2026-11-10', score:1, hits:2, misses:1, net:1});

// stats
eq('stats', stats(g2), { total:4, hits:3, misses:1, successPct:75 });
eq('stats empty', stats([{status:'active'}]), { total:0, hits:0, misses:0, successPct:0 });

// try-again reverses a miss: set back to active, clear resolution -> leaves the series
const g3=[{id:'x',status:'missed',resolvedOn:'2026-11-12'},{status:'hit',resolvedOn:'2026-11-05'}];
const tryAgain=g=>{g.status='active'; delete g.resolvedOn; delete g.done;};
tryAgain(g3[0]);
eq('after try-again series', scoreSeries(g3).map(p=>p.score), [1]);
eq('after try-again stats', stats(g3), { total:1, hits:1, misses:0, successPct:100 });

// out-of-order resolvedOn still sorts
const g4=[{status:'hit',resolvedOn:'2026-12-01'},{status:'missed',resolvedOn:'2026-11-01'}];
eq('unsorted input -> sorted series', scoreSeries(g4).map(p=>[p.date,p.score]),
  [['2026-11-01',-1],['2026-12-01',0]]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
