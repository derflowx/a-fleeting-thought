import {FLOCK_SIZE} from './flock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fitLineScale,centeredLine} from './framing.js';
import {TextModel} from './text-model.js';
test('keyboard, paste and speech share a single-line text boundary',()=>{const m=new TextModel(360,FLOCK_SIZE,true);m.setText('One\r\nwire\tfor\u2028all\u2029words','speech');assert.equal(m.text,'One wire for all words');});
test('short and maximum-length thoughts remain centered and fit a single row',()=>{
 for(const viewport of [320,650,1440])for(const widths of [[25,9,18],Array.from({length:FLOCK_SIZE},(_,i)=>10+i%25)]){
 const scale=fitLineScale(widths,viewport),positions=centeredLine(widths,viewport,scale),left=positions[0].x-positions[0].width/2,right=positions.at(-1).x+positions.at(-1).width/2;
 assert.ok(Math.abs((left+right)/2-viewport/2)<.0001);assert.ok(right-left<=viewport*.78+.001);assert.ok(positions.every(p=>p.row===0));
 }
});
test('adding letters only widens the view; removing them restores the original scale',()=>{const short=[20,20],long=Array(FLOCK_SIZE).fill(20);assert.equal(fitLineScale(short,650),1);assert.ok(fitLineScale(long,650)<.3);assert.equal(fitLineScale([],650),1);});

test('a new slot opens smoothly while the row remains exactly centered',async()=>{
 const {smoothAdvance}=await import('./framing.js');let advance=0,previous=0;
 for(let i=0;i<120;i++){advance=smoothAdvance(advance,24,1/60);const line=centeredLine([20,20,advance],650,1),left=line[0].x-line[0].width/2,right=line[2].x+line[2].width/2;assert.ok(Math.abs((left+right)/2-325)<1e-6);assert.ok(advance-previous<2);previous=advance;}
 assert.ok(Math.abs(advance-24)<.01);
});
