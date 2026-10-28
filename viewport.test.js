import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewport,projectPoint,unprojectPoint} from './viewport.js';
test('portrait, landscape and ultrawide views preserve the flock proportions',()=>{
 const a={x:400,y:180},b={x:600,y:300},ratio=(b.x-a.x)/(b.y-a.y);
 for(const [w,h]of [[360,900],[1280,720],[2200,500],[600,600]]){
 const view=createViewport(w,h),p=projectPoint(a,view),q=projectPoint(b,view);
 assert.ok(Math.abs((q.x-p.x)/(q.y-p.y)-ratio)<1e-9);
 assert.ok(Math.abs(Math.hypot(q.x-p.x,q.y-p.y)/Math.hypot(b.x-a.x,b.y-a.y)-view.scale)<1e-9);
 const restored=unprojectPoint(p,view);assert.ok(Math.hypot(restored.x-a.x,restored.y-a.y)<1e-9);
 const center=projectPoint({x:500,y:325},view);assert.equal(center.x,w/2);assert.equal(center.y,h/2);
 }
});
test('changing the viewport never changes a simulated bird position or velocity',()=>{
 const bird={x:610,y:220,z:50,vx:80,vy:-30},before={...bird};for(const [w,h]of [[400,900],[1800,600],[800,800]])projectPoint(bird,createViewport(w,h));assert.deepEqual(bird,before);
});
