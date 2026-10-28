import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrival,stepArrival} from './arrival.js';
function fly(target,dt=1/60){const p=createArrival({x:650,y:220,vx:80,vy:10});let peak=0;while(!p.landed&&p.age<12){const before={vx:p.vx,vy:p.vy};stepArrival(p,target,dt,2);if(!p.landed)peak=Math.max(peak,Math.hypot(p.vx-before.vx,p.vy-before.vy)/dt);}return {p,peak};}
test('arrival retains flock momentum and bounds steering acceleration',()=>{const p=createArrival({x:650,y:220,vx:80,vy:10});stepArrival(p,{x:200,y:420},1/60);assert.ok(p.vx>0,'initial forward momentum survives a target behind the bird');const {peak}=fly({x:200,y:420});assert.ok(peak<=420.001);});
test('near and far flights take different physical journeys around three seconds',()=>{const near=fly({x:500,y:400}).p,far=fly({x:100,y:420}).p;assert.ok(near.landed&&far.landed);assert.ok(near.age>2&&near.age<3.5);assert.ok(far.age>near.age+.8&&far.age<5);assert.equal(far.x,100);assert.equal(far.y,420);assert.equal(far.vx,0);});
test('arrival follows a moved target and remains stable across frame rates',()=>{for(const dt of [1/30,1/60,1/120]){const p=createArrival({x:650,y:220,vx:80,vy:10});while(!p.landed&&p.age<10)stepArrival(p,p.age<.8?{x:200,y:420}:{x:450,y:460},dt,2);assert.ok(p.landed);assert.equal(p.x,450);assert.equal(p.y,460);}});

test('persistent ±15% speed variation changes journey time',()=>{
 const times=[];
 for(const factor of [.85,1.15]){const p=createArrival({x:650,y:220,vx:80,vy:10,motionVariation:factor});while(!p.landed&&p.age<10)stepArrival(p,{x:200,y:420},1/60,2);assert.ok(p.landed);times.push(p.age);}
 assert.ok(times[0]>times[1]+.2);
});
test('touchdown overshoot varies by exactly ±15% and settles',async()=>{
 const {createLanding,stepLanding}=await import('./arrival.js');const peaks=[];
 for(const variation of [.85,1,1.15]){const spring=createLanding(variation);let peak=0;for(let i=0;i<180;i++){stepLanding(spring,1/60);peak=Math.max(peak,Math.abs(spring.offset));}assert.ok(Math.abs(spring.offset)<.001);peaks.push(peak);}
 assert.ok(Math.abs(peaks[0]/peaks[1]-.85)<.0001);assert.ok(Math.abs(peaks[2]/peaks[1]-1.15)<.0001);
});

test('birds land while the text keeps moving and the wire keeps oscillating',()=>{
 for(const speed of [-35,-90]){
  const p=createArrival({x:650,y:220,vx:80,vy:10});
  while(!p.landed&&p.age<8){const t=p.age+1/60;stepArrival(p,{x:700+speed*t,y:415+2*Math.sin(t*5),vx:speed,vy:10*Math.cos(t*5)},1/60,2);}
  assert.ok(p.landed,`moving target at ${speed} should not require a typing pause`);assert.ok(p.age<6);assert.equal(p.vx,speed);
 }
});

test('bulk takeoffs are randomized inside a fixed 300 ms window',async()=>{
 const {releaseOffsets}=await import('./arrival.js');let i=0;const delays=releaseOffsets(4,()=>[.8,.1,.9,.4][i++]);assert.equal(Math.min(...delays),0);assert.ok(Math.max(...delays)<=.3);assert.ok(delays[0]>delays[1]&&delays[2]>delays[3]);assert.deepEqual(releaseOffsets(1),[0]);assert.deepEqual(releaseOffsets(0),[]);
});
