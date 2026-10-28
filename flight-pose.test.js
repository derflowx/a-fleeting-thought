import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFlightPose,flightSilhouette} from './flight-pose.js';
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>Math.hypot(a.x,a.y,a.z);
const bird=(vx,vy,vz)=>({vx,vy,vz});
test('flight frame follows 3D velocity with perpendicular normalized axes',()=>{
 const b=bird(70,-30,45);advanceFlightPose(b,1/60);const p=b.flightPose;
 assert.ok(dot(p.forward,{x:b.vx/norm(p.velocity),y:b.vy/norm(p.velocity),z:b.vz/norm(p.velocity)})>.999);
 for(const axis of [p.forward,p.up,p.right])assert.ok(Math.abs(norm(axis)-1)<1e-8);
 assert.ok(Math.abs(dot(p.forward,p.up))<1e-8);assert.ok(p.up.y<0);
});
test('vertical crossings retain a continuous finite frame',()=>{
 const b=bird(80,0,0);let last;
 for(let i=0;i<1200;i++){
  const a=i/120;b.vx=80*Math.cos(a);b.vy=-80*Math.sin(a);b.vz=12*Math.sin(a*.7);
  const p=advanceFlightPose(b,1/60);
  for(const axis of [p.forward,p.up,p.right])assert.ok(Math.abs(norm(axis)-1)<1e-6);
  assert.ok(Math.abs(dot(p.up,p.forward))<1e-6);
  if(last){assert.ok(dot(last.up,p.up)>.98,'up must not flip at vertical');assert.ok(dot(last.forward,p.forward)>.98);}
  last=p;
 }
});
test('opposite depth turns bank in opposite directions then recover',()=>{
 const a=bird(80,0,0),b=bird(80,0,0);advanceFlightPose(a,1/60);advanceFlightPose(b,1/60);
 for(let i=0;i<30;i++){a.vz+=1;b.vz-=1;advanceFlightPose(a,1/60);advanceFlightPose(b,1/60);}
 assert.ok(a.flightPose.bank<-.1);assert.ok(b.flightPose.bank>.1);
 for(let i=0;i<240;i++)advanceFlightPose(a,1/60);
 assert.ok(Math.abs(a.flightPose.bank)<.001);
});
test('side frontal and climbing views change projected anatomy',()=>{
 const shapes=[bird(80,0,0),bird(0,0,80),bird(0,-80,0)].map(b=>flightSilhouette(advanceFlightPose(b,1/60),0,1));
 const span=s=>Math.abs(s.wings[0][2].x-s.wings[1][2].x);
 assert.ok(span(shapes[1])>span(shapes[0])+1.5,'wings foreshorten in profile');
 assert.ok(Math.abs(shapes[0].beak.x)>.7);assert.ok(Math.abs(shapes[1].beak.x)<.01);
 assert.ok(shapes[2].beak.y<-.7);
});
