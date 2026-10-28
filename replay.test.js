import test from 'node:test';
import assert from 'node:assert/strict';
import {Tape,applyEdit,encodeReplay,decodeReplay,validateReplay,seededRandom} from './replay.js';
test('a replay preserves pauses, corrections, mid-word editing and release',async()=>{const t=new Tape(142);const edits=[['','bird',20],['bird','birds',20.2],['birds','words',22.8],['words','',25,'release']];for(const [a,b,time,source]of edits)t.record(a,b,time,source);const decoded=await decodeReplay(await encodeReplay(t.data()));assert.deepEqual(decoded,t.data());assert.deepEqual(decoded.events.map(e=>e[0]),[700,900,3500,5700]);let text='';for(const [i,event]of decoded.events.entries()){text=applyEdit(text,event);assert.equal(text,edits[i][1]);}assert.equal(decoded.events[3][4],1);});
test('Unicode edits preserve complete characters',()=>{const t=new Tape(1);t.record('','🕊 café',0);t.record('🕊 café','🕊 cafe',.1);let text='';for(const e of t.events)text=applyEdit(text,e);assert.equal(text,'🕊 cafe');});
test('invalid links and impossible edits fail safely',async()=>{await assert.rejects(decodeReplay('broken'));assert.throws(()=>validateReplay({v:1,seed:1,events:[[700,12,0,'x',0]]}));assert.throws(()=>validateReplay({v:1,seed:1,events:[[700,0,0,'x'.repeat(161),0]]}));});
test('bird variation uses a reproducible seeded stream',()=>{const a=seededRandom(42),b=seededRandom(42);for(let i=0;i<100;i++)assert.equal(a(),b());});

test('legacy 160-bird recordings fit the 99-bird flock without invalid edit positions',async()=>{
 const {fitReplayToFlock}=await import('./replay.js');const legacy=new Tape(1);legacy.record('','x'.repeat(160),0);legacy.record('x'.repeat(160),'x'.repeat(110),1);legacy.record('x'.repeat(110),'hello',2);
 const fitted=fitReplayToFlock(legacy.data());let text='';for(const e of fitted.events){text=applyEdit(text,e);assert.ok(Array.from(text).filter(c=>!/\s/.test(c)).length<=99);}assert.equal(text,'hello');
});
