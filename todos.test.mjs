// Verify to-do (Eisenhower matrix) weighted scoring + per-day chart series.
// A todo: { id, title, urgent:bool, important:bool, endDate?, notes,
//           status:'active'|'hit'|'missed', resolvedOn?, weight? }
// Weight = (urgent?2:1) * (important?3:1):  U+I=6, U+!I=2, !U+I=3, !U+!I=1.
// hit = +weight, miss = -weight. Weight is LOCKED at resolution (stored on resolve).
// Chart: ONE point per day = net of that day's weighted +/-, cumulative, sorted.

function parseISO(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function todoWeight(t){ return (t.urgent?2:1) * (t.important?3:1); }

function applyAutoMiss(todos, todayISO){
  const today=parseISO(todayISO); let n=0;
  for(const t of todos){
    if(t.status==='active' && !t.done && t.endDate && parseISO(t.endDate) < today){
      t.status='missed'; t.resolvedOn=t.endDate; t.weight=todoWeight(t); n++;
    }
  }
  return n;
}
// cumulative weighted series, one point per day (net), sorted
function scoreSeries(todos){
  const resolved=todos.filter(t=>t.status==='hit'||t.status==='missed');
  const byDay=new Map();
  for(const t of resolved){
    const w = t.weight!=null ? t.weight : todoWeight(t);
    const delta = t.status==='hit' ? w : -w;
    const cur = byDay.get(t.resolvedOn) || {delta:0, hits:0, misses:0};
    cur.delta += delta; if(t.status==='hit') cur.hits++; else cur.misses++;
    byDay.set(t.resolvedOn, cur);
  }
  const days=[...byDay.keys()].sort();
  let cum=0; const pts=[];
  for(const iso of days){ const d=byDay.get(iso); cum+=d.delta; pts.push({date:iso,score:cum,hits:d.hits,misses:d.misses,net:d.delta}); }
  return pts;
}
function stats(todos){
  const resolved=todos.filter(t=>t.status==='hit'||t.status==='missed');
  const hits=resolved.filter(t=>t.status==='hit').length;
  return {total:resolved.length, hits, misses:resolved.length-hits, successPct: resolved.length?Math.round(hits/resolved.length*100):0};
}

let pass=0,fail=0;
function eq(n,g,w){const ok=JSON.stringify(g)===JSON.stringify(w);console.log(`${ok?'PASS':'FAIL'}  ${n}${ok?'':`\n   got=${JSON.stringify(g)}\n  want=${JSON.stringify(w)}`}`);ok?pass++:fail++;}

// weights
eq('U+I = 6', todoWeight({urgent:true,important:true}), 6);
eq('U+!I = 2', todoWeight({urgent:true,important:false}), 2);
eq('!U+I = 3', todoWeight({urgent:false,important:true}), 3);
eq('!U+!I = 1', todoWeight({urgent:false,important:false}), 1);

// hit scores +weight at the quadrant when resolved (weight locked)
const t1=[{status:'hit', resolvedOn:'2026-11-05', weight:6}];
eq('hit +6', scoreSeries(t1).map(p=>p.score), [6]);
const t2=[{status:'missed', resolvedOn:'2026-11-05', weight:3}];
eq('miss -3', scoreSeries(t2).map(p=>p.score), [-3]);

// per-day net across quadrants
const t3=[
  {status:'hit',    resolvedOn:'2026-11-10', weight:6}, // U+I  +6
  {status:'missed', resolvedOn:'2026-11-10', weight:2}, // U+!I -2  -> day net +4
  {status:'hit',    resolvedOn:'2026-11-12', weight:1}, // +1 -> cum 5
];
eq('day1 net +4', scoreSeries(t3)[0], {date:'2026-11-10',score:4,hits:1,misses:1,net:4});
eq('cum series', scoreSeries(t3).map(p=>p.score), [4,5]);

// auto-miss locks weight at resolution using the stored quadrant
const t4=[{status:'active',done:false,urgent:true,important:true,endDate:'2026-11-10'}];
eq('auto-miss count', applyAutoMiss(t4,'2026-11-20'), 1);
eq('auto-miss locked weight 6 on endDate', [t4[0].status,t4[0].resolvedOn,t4[0].weight], ['missed','2026-11-10',6]);

// moving quadrant before resolving changes the locked weight (weight at resolution)
const t5={status:'active',urgent:false,important:false}; // would be 1
t5.urgent=true; t5.important=true;                        // moved to U+I
const resolvedWeight=todoWeight(t5);
eq('weight at resolution after move', resolvedWeight, 6);

// stats count every todo, unweighted
eq('stats', stats([{status:'hit',weight:6},{status:'missed',weight:1},{status:'hit',weight:3}]),
  {total:3,hits:2,misses:1,successPct:67});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
