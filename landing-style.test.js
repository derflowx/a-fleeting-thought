import test from 'node:test';
import assert from 'node:assert/strict';
import {landingCharacter,landingPerformance} from './landing-style.js';
import {drawMorph,MORPH_DURATION} from './morph.js';
const birds=Array.from({length:99},(_,id)=>({id,phase:id*.0617}));
test('bird identities produce repeatable varied landing personalities',()=>{
 const styles=birds.map(landingCharacter);
 assert.deepEqual(styles,birds.map(landingCharacter));
 assert.deepEqual(new Set(styles.map(s=>s.extraFlaps)),new Set([0,1,2]));
 assert.deepEqual(new Set(styles.map(s=>s.facing)),new Set([-1,1]));
 assert.ok(styles.some(s=>s.bow===0)&&styles.some(s=>s.bow>.15));
 assert.ok(new Set(styles.map(s=>s.settleTime)).size>90);
});
test('extra balancing wingbeats vary the settle time and all birds resolve promptly',()=>{
 const completion=[];
 for(const b of birds){const s=landingCharacter(b),a=landingPerformance(s,0,1.2);
  assert.equal(a.morphAge,0);assert.equal(a.phase,1.2);assert.equal(a.style.bow,0);
  const end=s.settleTime+MORPH_DURATION/s.morphRate;
  completion.push(end);assert.ok(end<1.7);
  assert.ok(landingPerformance(s,end+.01).morphAge>=MORPH_DURATION);
  const midway=landingPerformance(s,s.settleTime/2);
  assert.ok(Number.isFinite(midway.phase));assert.ok(midway.wingStrength>=0&&midway.wingStrength<=1);
 }
 assert.ok(Math.max(...completion)-Math.min(...completion)>.4);
});
test('left-facing and bowing landings preserve exact completed glyph geometry',()=>{
 const render=(style,elapsed)=>{const points=[];const ctx={save(){},restore(){},translate(){},beginPath(){},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},closePath(){},fill(){}};
  drawMorph(ctx,'B',0,0,36,elapsed,1,1,0,1,style);return points;};
 const neutral=render({},MORPH_DURATION);
 assert.deepEqual(render({facing:-1,bow:.2,headTilt:.1,wingBias:.8},MORPH_DURATION),neutral);
 assert.notDeepEqual(render({facing:-1,bow:.2},0),render({},0));
 for(const b of birds){const c=landingCharacter(b);for(const age of [0,.15,.35,.65,1]){const p=landingPerformance(c,age);assert.ok(render(p.style,p.morphAge).flat().every(Number.isFinite));}}
});
