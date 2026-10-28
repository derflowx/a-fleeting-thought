import {FLOCK_SIZE} from './flock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TextModel,reconcile,layoutText} from './text-model.js';
test('input adapter normalizes, limits Unicode characters and emits source',()=>{const m=new TextModel(4);let detail;m.addEventListener('change',e=>detail=e.detail);m.setText('a\r\n🕊bc','speech');assert.equal(m.text,'a\n🕊b');assert.equal(detail.source,'speech');});
test('mid-text replacement preserves the unchanged suffix',()=>{assert.deepEqual(reconcile('the bird flies','the word flies'),{start:4,remove:2,insert:['w','o']});});
test('deletion and release produce exact removals',()=>{assert.deepEqual(reconcile('sky!','sky'),{start:3,remove:1,insert:[]});assert.equal(reconcile('sky','').remove,3);});
test('word wrapping, explicit lines and long words stay in bounds',()=>{const out=layoutText(Array.from('ab cd\neeeeeee'),()=>10,50);assert.equal(out.positions[3].row,0);assert.equal(out.positions[6].row,1);assert.equal(out.rows,3);assert.ok(out.positions.every(p=>p.x+p.width<=50));});

test('a full flock rejects all insertion, whitespace and replacement until a deletion',()=>{
 const m=new TextModel(360,FLOCK_SIZE,true);m.setText('a'.repeat(FLOCK_SIZE));assert.equal(m.full,true);
 for(const value of [m.text+' ',m.text+'\n',m.text+'\t',m.text+'z','b'+m.text.slice(1)]){m.setText(value);assert.equal(m.text,'a'.repeat(FLOCK_SIZE));}
 m.setText(m.text.slice(0,-1));assert.equal(m.full,false);m.setText(m.text+' ');assert.ok(m.text.endsWith(' '));
});
test('a single paste stops exactly at the last bird, with no trailing whitespace',()=>{const m=new TextModel(360,FLOCK_SIZE,true);m.setText('x'.repeat(FLOCK_SIZE)+' \n extra');assert.equal(m.text,'x'.repeat(FLOCK_SIZE));});
