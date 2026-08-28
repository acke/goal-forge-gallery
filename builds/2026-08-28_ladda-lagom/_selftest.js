"use strict";
var CAP=75, WHKM=175, EFF=0.93;
var SOC=[0,5,10,15,20,25,30,40,50,60,70,80,90,95,100];
var KW=[110,190,245,250,248,225,205,172,138,112,90,70,46,32,18];
function idealKW(s){if(s<=0)return KW[0];if(s>=100)return KW[KW.length-1];
 for(var i=0;i<SOC.length-1;i++){if(s>=SOC[i]&&s<=SOC[i+1]){var t=(s-SOC[i])/(SOC[i+1]-SOC[i]);return KW[i]+t*(KW[i+1]-KW[i]);}}return KW[KW.length-1];}
function powerAt(s,ck,pc){var p=idealKW(s);p=Math.min(p,ck);if(ck>50&&!pc)p=Math.min(p,85);return p;}
function sim(st,e,ck,price,pc){if(e<=st)return null;var step=0.25,h=0,kwh=0,tail=0;
 for(var s=st;s<e;s+=step){var p=powerAt(s+step/2,ck,pc);var dE=CAP*(step/100);var dt=dE/p;h+=dt;kwh+=dE;if(s>=80)tail+=dt;}
 var km=kwh/(WHKM/1000);var grid=kwh/EFF;return{min:h*60,km:km,kwh:kwh,cost:grid*price,tail:tail*60};}
function show(l,r){console.log(l,r?{min:+r.min.toFixed(1),km:Math.round(r.km),kwh:+r.kwh.toFixed(1),cost:Math.round(r.cost),tail:+r.tail.toFixed(1)}:null);}
show("10->80 V3 warm",sim(10,80,250,4.9,true));
show("10->100 V3 warm",sim(10,100,250,4.9,true));
show("10->60 V3 warm",sim(10,60,250,4.9,true));
show("10->80 V3 cold",sim(10,80,250,4.9,false));
show("20->80 V2",sim(20,80,150,4.5,true));
show("30->90 home11",sim(30,90,11,2.6,true));
show("edge e<=s",sim(80,80,250,4.9,true));
// check no NaN across a sweep
var bad=0;for(var a=2;a<70;a+=7)for(var b=30;b<=100;b+=10){var r=sim(a,b,250,4.9,true);if(r&&(isNaN(r.min)||isNaN(r.km)))bad++;}
console.log("NaN count:",bad);
