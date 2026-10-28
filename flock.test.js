import test from 'node:test';
import assert from 'node:assert/strict';
import {Flock,FLOCK_SIZE} from './flock.js';
import {TextModel} from './text-model.js';
function random(){let seed=937;return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}
test('a fixed pool cannot lend one bird twice, and all released birds rejoin',()=>{
 const f=new Flock(FLOCK_SIZE,random()),borrowed=Array.from({length:FLOCK_SIZE},()=>f.borrow());
 assert.equal(new Set(borrowed.map(b=>b.id)).size,FLOCK_SIZE);assert.equal(f.borrow(),null);
 for(const b of borrowed)assert.ok(f.returnBird(b,300+b.id,400,-100,-250));
 assert.equal(f.returnBird(borrowed[0],0,0,0,0),false);
 for(let i=0;i<1500;i++)f.step(1/60);
 assert.deepEqual(f.counts(),{flock:FLOCK_SIZE,letter:0,returning:0});
});
test('local neighbours change a bird trajectory; simulation remains finite',()=>{
 const a=new Flock(FLOCK_SIZE,random()),b=new Flock(FLOCK_SIZE,random());
 b.birds.slice(1).forEach(p=>p.state='letter');
 for(let i=0;i<20;i++){a.step(1/60);b.step(1/60);}
 assert.ok(Math.hypot(a.birds[0].vx-b.birds[0].vx,a.birds[0].vy-b.birds[0].vy)>.1);
 for(let i=0;i<3600;i++)a.step(1/60);
 for(const bird of a.birds){for(const key of ['x','y','z','vx','vy','vz'])assert.ok(Number.isFinite(bird[key]));assert.ok(bird.x>-100&&bird.x<1100);assert.ok(bird.y>-50&&bird.y<500);}
});
test('fixed-population visible glyphs, whitespace and Unicode respect the finite population',()=>{
 const m=new TextModel(360,FLOCK_SIZE);m.setText(('🕊 ').repeat(180),'speech');
 assert.equal(Array.from(m.text).filter(c=>!/\s/.test(c)).length,FLOCK_SIZE);
 assert.ok(m.text.includes(' '));
});

test('a delayed takeoff holds position until its own launch',()=>{
 const f=new Flock(1,random()),b=f.borrow();f.returnBird(b,300,400,-100,-250,.3);
 for(let i=0;i<10;i++)f.step(1/60);assert.equal(b.x,300);assert.equal(b.y,400);assert.equal(b.returnAge,0);
 for(let i=0;i<9;i++)f.step(1/60);assert.ok(b.returnAge>0);assert.notEqual(b.y,400);
});
