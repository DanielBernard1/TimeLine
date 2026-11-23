// Verify nested task-list progress (leaf-driven, by-leaf counting).
// A node: { id, title, done?:bool, children:[] }. Only LEAVES (no children)
// carry `done`. A parent's progress = done leaves / total leaves beneath it.
// Mirrors the logic that goes into index.html.

// Returns { done, total } leaf counts under a node (inclusive).
function leafCounts(node) {
  if (!node.children || node.children.length === 0) {
    return { done: node.done ? 1 : 0, total: 1 }; // the node itself is a leaf
  }
  let done = 0, total = 0;
  for (const c of node.children) { const r = leafCounts(c); done += r.done; total += r.total; }
  return { done, total };
}
function progress(node) { const { done, total } = leafCounts(node); return total ? done / total : 0; }
// total across a forest of roots
function totalCounts(roots) {
  let done = 0, total = 0;
  for (const r of roots) { const c = leafCounts(r); done += c.done; total += c.total; }
  return { done, total };
}
// delete a node (by id) anywhere in the forest, pruning its subtree
function deleteNode(roots, id) {
  const rec = arr => arr.filter(n => n.id !== id).map(n => n.children ? { ...n, children: rec(n.children) } : n);
  return rec(roots);
}

let pass=0,fail=0;
function eq(n,g,w){const ok=JSON.stringify(g)===JSON.stringify(w);console.log(`${ok?'PASS':'FAIL'}  ${n}${ok?'':`\n   got=${JSON.stringify(g)}\n  want=${JSON.stringify(w)}`}`);ok?pass++:fail++;}

// Uni -> ML -> Lectures -> 1,2,3,4 ; ML -> Exam (leaf)
const tree = {
  id:'uni', title:'Uni', children:[
    { id:'ml', title:'Machine Learning', children:[
      { id:'lec', title:'Lectures', children:[
        {id:'l1',title:'1',done:true},{id:'l2',title:'2',done:true},
        {id:'l3',title:'3',done:false},{id:'l4',title:'4',done:false},
      ]},
      { id:'exam', title:'Exam', done:false },
    ]},
  ],
};

eq('Lectures: 2/4', leafCounts(tree.children[0].children[0]), {done:2,total:4});
eq('ML: 2/5 (4 lectures + 1 exam)', leafCounts(tree.children[0]), {done:2,total:5});
eq('Uni: 2/5', leafCounts(tree), {done:2,total:5});
eq('Lectures progress = 0.5', progress(tree.children[0].children[0]), 0.5);
eq('ML progress = 0.4', progress(tree.children[0]), 0.4);

// a leaf's own progress
eq('leaf done -> 1', progress({id:'x',title:'x',done:true}), 1);
eq('leaf not done -> 0', progress({id:'x',title:'x',done:false}), 0);

// total across a forest (by leaves — used by per-parent bars)
const forest = [tree, { id:'sport', title:'Sport', children:[{id:'run',title:'Run',done:true}] }];
eq('forest total 3/6', totalCounts(forest), {done:3,total:6});

// MAIN bar: counts whole top-level tasks (0 until a root is 100%).
function mainBar(roots) {
  let completed = 0;
  for (const n of roots) { const c = leafCounts(n); if (c.total > 0 && c.done === c.total) completed++; }
  return { completed, total: roots.length };
}
// Uni is 2/5 (not complete) -> 0; Sport's only leaf is done -> complete
eq('main bar 1/2 (Sport done, Uni partial)', mainBar(forest), {completed:1, total:2});
// complete Uni fully -> 2/2
const uniDone = JSON.parse(JSON.stringify(tree));
uniDone.children[0].children[0].children.forEach(l=>l.done=true); // all lectures
uniDone.children[0].children[1].done = true;                       // exam
eq('main bar 2/2 when both roots complete', mainBar([uniDone, forest[1]]), {completed:2, total:2});

// parent "done" when all leaves done
const allDone = { id:'p', title:'p', children:[{id:'a',done:true},{id:'b',done:true}] };
eq('all leaves done -> progress 1', progress(allDone), 1);

// delete prunes subtree: removing Lectures leaves ML with just the Exam leaf
const afterDel = deleteNode([tree], 'lec');
eq('after delete Lectures, Uni = 0/1', leafCounts(afterDel[0]), {done:0,total:1});
// deleting a whole top-level node
eq('delete root ml-subtree via uni', deleteNode([tree],'uni').length, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
