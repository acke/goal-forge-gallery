// Sanity test of Cron Whisperer core logic (mirrors index.html)
const DOW_SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MON_SHORT = ["","JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function parseField(raw, min, max, names){
  raw = raw.trim();
  if(raw==="") throw new Error("empty field");
  const isAll = (raw==="*");
  let step = null;
  const sm = raw.match(/^\*\/(\d+)$/); if(sm) step=parseInt(sm[1],10);
  const set = new Set();
  const resolve = tok => {
    tok=tok.trim();
    if(/^\d+$/.test(tok)) return parseInt(tok,10);
    if(names){ const i=names.indexOf(tok.toUpperCase()); if(i>=0) return i; }
    throw new Error('"'+tok+'" invalid');
  };
  for(const part of raw.split(",")){
    let [rangePart, stepStr]=part.split("/");
    let st=1;
    if(stepStr!==undefined){ if(!/^\d+$/.test(stepStr)||parseInt(stepStr,10)<1) throw new Error("bad step"); st=parseInt(stepStr,10); }
    let lo,hi;
    if(rangePart==="*"){lo=min;hi=max;}
    else if(rangePart.includes("-")){const seg=rangePart.split("-");if(seg.length!==2)throw new Error("bad range");lo=resolve(seg[0]);hi=resolve(seg[1]);}
    else {lo=hi=resolve(rangePart);}
    const norm=v=>(names===DOW_SHORT&&v===7)?0:v;
    lo=norm(lo);hi=norm(hi);
    if(lo>hi){ for(let v=lo;v<=max;v++){if((v-lo)%st===0)set.add(norm(v));} for(let v=min;v<=hi;v++)set.add(norm(v)); }
    else { for(let v=lo;v<=hi;v+=st){ if(v<min||v>max)throw new Error(v+" out of range"); set.add(norm(v)); } }
  }
  if(set.size===0) throw new Error("no values");
  return {set,isAll,step};
}
function parseCron(text){
  const p=text.trim().split(/\s+/);
  if(p.length!==5) throw new Error("need 5 fields, got "+p.length);
  return {minute:parseField(p[0],0,59,null),hour:parseField(p[1],0,23,null),dom:parseField(p[2],1,31,null),month:parseField(p[3],1,12,MON_SHORT),dow:parseField(p[4],0,6,DOW_SHORT),raw:p};
}
function matches(f,d){
  if(!f.minute.set.has(d.getMinutes()))return false;
  if(!f.hour.set.has(d.getHours()))return false;
  if(!f.month.set.has(d.getMonth()+1))return false;
  const domR=!f.dom.isAll,dowR=!f.dow.isAll;
  const domOk=f.dom.set.has(d.getDate()),dowOk=f.dow.set.has(d.getDay());
  if(domR&&dowR)return domOk||dowOk;
  if(domR)return domOk;
  if(dowR)return dowOk;
  return true;
}
function nextRuns(f,count,from){
  const out=[];const d=new Date(from.getTime());d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);
  const end=from.getTime()+366*5*24*3600*1000;let g=0;
  while(out.length<count&&d.getTime()<=end&&g<3000000){ if(matches(f,d))out.push(new Date(d.getTime())); d.setMinutes(d.getMinutes()+1); g++; }
  return out;
}
const pad=n=>String(n).padStart(2,"0");
const fmt=d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+d.getDate()+"/"+(d.getMonth()+1)+" "+pad(d.getHours())+":"+pad(d.getMinutes());

const base=new Date(2026,7,16,2,0,0); // 16 Aug 2026 02:00 local
const cases=["0 2 * * *","*/5 * * * *","0 9 * * 1-5","30 8 1 * *","0 0 * * 0","15 14 * * 1","0 0 31 2 *","0 0 1 1 *","0 12 * * FRI-MON","*/15 9-17 * * 1-5"];
for(const c of cases){
  try{
    const f=parseCron(c);
    const runs=nextRuns(f,3,base).map(fmt);
    console.log(c.padEnd(20), "=>", runs.length?runs.join("  |  "):"(never)");
  }catch(e){ console.log(c.padEnd(20), "ERR:", e.message); }
}
// error cases
for(const c of ["0 2 * *","61 * * * *","0 2 * * XYZ","*/0 * * * *"]){
  try{ parseCron(c); console.log(c.padEnd(20),"(should have errored!)"); }
  catch(e){ console.log(c.padEnd(20),"OK-rejects:",e.message); }
}
