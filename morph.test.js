import test from 'node:test';
import assert from 'node:assert/strict';
import {geometry,partProgress,MORPH_DURATION,drawMorph,PART_DURATIONS,releaseMotion} from './morph.js';
import {glyphs} from './glyphs.js';
test('all extracted outlines and fallback produce six finite, paired vector parts',()=>{
 for(const char of [...Object.keys(glyphs),'🕊']){
  const parts=geometry(char);assert.equal(parts.length,6,char);
  for(const rings of parts)for(const ring of rings){assert.equal(ring.source.length,ring.target.length);for(const p of [...ring.source,...ring.target])assert.ok(p.every(Number.isFinite),char);}
 }
});
test('parts begin as birds, snap in anatomical order and finish exactly on the letter',()=>{
 for(let i=0;i<6;i++){assert.equal(partProgress(0,i),0);assert.equal(partProgress(MORPH_DURATION,i),1);}
 assert.ok(partProgress(.15,0)>partProgress(.15,1));assert.equal(partProgress(.15,5),0);
});
test('renderer never substitutes font text or fades between shapes',()=>{
 let fills=0;const ctx={save(){},restore(){},translate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(rule){assert.equal(rule,'evenodd');fills++;}};
 for(const elapsed of [0,.3,.6,1.3])drawMorph(ctx,'B',0,0,36,elapsed);
 assert.equal(fills,19);
});

test('non-wing parts use half duration and wings use a fast power snap',()=>{
 for(let i=2;i<6;i++)assert.equal(PART_DURATIONS[i],PART_DURATIONS[0]/2);
 assert.ok(partProgress(.1,0)>.65);
});
test('deleting a long-settled glyph immediately moves and promptly reverses',()=>{
 const first=releaseMotion(100,.016);assert.equal(first.flight,.016);assert.ok(first.morphAge<MORPH_DURATION);
 const half=releaseMotion(100,.08);assert.ok(half.morphAge<=MORPH_DURATION/2);
 assert.equal(releaseMotion(100,.16).morphAge,0);
});
