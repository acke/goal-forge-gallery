"use strict";
// Extracts the browser script (everything before the DOM-wiring section),
// stubs nothing (that part is pure), evals it, and exercises parse+layout+SVG.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const script = html.split('<script>')[1].split('</script>')[0];
const cut = script.indexOf('/* ---------- 4. DOM WIRING');
const pure = script.slice(0, cut);

const sandbox = {};
const fn = new Function('exports', pure + '\nexports.parseRegex=parseRegex;exports.mergeLiterals=mergeLiterals;exports.layout=layout;exports.buildDiagram=buildDiagram;');
fn(sandbox);
const { parseRegex, mergeLiterals, layout, buildDiagram } = sandbox;

const cases = [
  '(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]',
  '\\d{3} ?\\d{2}',
  '[\\w.+-]+@[\\w-]+\\.[\\w.]+',
  '(fika|kaffe|te)( ?paus| ?rast)?',
  '#[0-9a-fA-F]{6}\\b',
  '\\b(\\w+)( \\1)+\\b',
  'a*b+c?',
  '(?:abc|def){2,5}?',
  '(?<year>\\d{4})-(?<mo>\\d{2})',
  'a{3}',
  'a{2,}',
  '',                    // empty pattern
  'colou?r',
  '^\\s*$',
  '[^abc]+',
  '(?=lookahead)tail',   // fancy — should still layout via 'lookahead' group
  'a|b|c|d',
];

function walk(n, chk){
  chk(n);
  if(n.kids) n.kids.forEach(k=>walk(k,chk));
  if(n.child) walk(n.child,chk);
}

let pass=0, fail=0;
for(const c of cases){
  try{
    const ast = mergeLiterals(parseRegex(c));
    const lay = layout(ast);
    // check finite, positive sizes recursively
    walk(lay, n=>{
      for(const key of ['width','up','down']){
        if(n[key]!==undefined && !(Number.isFinite(n[key]) && n[key]>=0))
          throw new Error('bad '+key+' ('+n[key]+') on kind '+n.kind);
      }
    });
    const svg = buildDiagram(ast);
    if(!svg.startsWith('<svg') || !svg.includes('</svg>')) throw new Error('svg malformed');
    if(svg.includes('NaN') || svg.includes('undefined')) throw new Error('svg contains NaN/undefined');
    console.log('PASS  /'+c+'/  ('+svg.length+' bytes svg)');
    pass++;
  }catch(e){
    console.log('FAIL  /'+c+'/  -> '+e.message);
    fail++;
  }
}
// intentional throw cases (our parser SHOULD reject these; UI catches & falls back)
for(const bad of ['(abc', '[abc']){
  try{ parseRegex(bad); console.log('FAIL  expected throw for /'+bad+'/'); fail++; }
  catch(e){ console.log('PASS  throws as expected /'+bad+'/  ('+e.message+')'); pass++; }
}
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
