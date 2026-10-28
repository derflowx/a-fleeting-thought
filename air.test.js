import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWings} from './air.js';
import {Flock,FLOCK_SIZE} from './flock.js';
test('climbs increase wingbeat frequency and descent settles into a still glide',()=>{
 const level={phase:0},climb={phase:0},dive={phase:1};
 for(let i=0;i<120;i++){advanceWings(level,0,1/60);advanceWings(climb,-100,1/60);advanceWings(dive,80,1/60);}
 assert.ok(climb.wingPhase>level.wingPhase*2);assert.equal(dive.wingPhase,1);assert.ok(dive.wingStrength<.001);assert.ok(climb.wingStrength>.99);
 const before=dive.wingStrength;advanceWings(dive,-100,1/60);assert.ok(dive.wingStrength>before&&dive.wingStrength<.2,'climb resumes gently rather than snapping');
});
test('the simulated flock changes its proportions after its initial settling',()=>{
 let seed=937;const flock=new Flock(FLOCK_SIZE,()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;});const ratios=[];
 for(let i=0;i<2100;i++){flock.step(1/60);if(i>300&&i%120===0){const c=flock.center(),variance=axis=>flock.birds.reduce((s,b)=>s+(b[axis]-c[axis])**2,0)/FLOCK_SIZE;ratios.push(Math.sqrt(variance('x')/variance('y')));}}
 assert.ok(Math.max(...ratios)/Math.min(...ratios)>2,'shape should stretch and compress, not move as a rigid group');assert.deepEqual(flock.counts(),{flock:FLOCK_SIZE,letter:0,returning:0});
});
