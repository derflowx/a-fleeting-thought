const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Positions live in the flock's 1000 × 650 world, independent of viewport size.
// A velocity-matching arrival force preserves flock momentum, limits turning
// acceleration, and brakes near the moving landing point. No timed path.
export function createArrival(bird){return {x:bird.x,y:bird.y,vx:bird.vx,vy:bird.vy,motionVariation:bird.motionVariation??1,landingVariation:bird.landingVariation??1,initialDistance:null,remaining:1,landed:false,age:0};}
export function stepArrival(p,target,dt,seed=0){
 if(p.landed)return p;
 dt=Math.min(dt,.04);p.age+=dt;
 const dx=target.x-p.x,dy=target.y-p.y,distance=Math.hypot(dx,dy);
 if(p.initialDistance===null)p.initialDistance=Math.max(1,distance);
 const cruise=270*p.motionVariation,desiredSpeed=Math.min(cruise,distance*6*p.landingVariation),inv=1/Math.max(.001,distance);
 // Gentle bank while peeling away; force falls off as the feet approach.
 const bank=Math.sin(p.age*2.4+seed)*12*Math.min(1,distance/100);
 // Near the wire, match the slot's velocity as well as its position. A bird
 // can perch on a moving cable; it does not have to stop in screen space.
 const targetVx=target.vx??0,targetVy=target.vy??0,follow=1/(1+(distance/100)**4);
 let ax=(dx*inv*desiredSpeed+targetVx*follow-p.vx)*9-dy*inv*bank;
 let ay=(dy*inv*desiredSpeed+targetVy*follow-p.vy)*9+dx*inv*bank;
 const acceleration=Math.hypot(ax,ay),limit=420*p.motionVariation;
 if(acceleration>limit){ax*=limit/acceleration;ay*=limit/acceleration;}
 p.vx+=ax*dt;p.vy+=ay*dt;
 const speed=Math.hypot(p.vx,p.vy);if(speed>cruise){p.vx*=cruise/speed;p.vy*=cruise/speed;}
 p.x+=p.vx*dt;p.y+=p.vy*dt;
 const remaining=Math.hypot(target.x-p.x,target.y-p.y);
 p.remaining=clamp(remaining/p.initialDistance,0,1);
 if(remaining<3.2&&Math.hypot(p.vx-targetVx,p.vy-targetVy)<12){p.x=target.x;p.y=target.y;p.vx=targetVx;p.vy=targetVy;p.remaining=0;p.landed=true;}
 return p;
}

export function createLanding(variation=1,size=36){return {offset:0,velocity:size*1.5*variation};}
export function stepLanding(s,dt){
 // Small damped touchdown overshoot; linear dynamics preserve the ±15% range.
 const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
 for(let i=0;i<steps;i++){s.velocity+=(-120*s.offset-17*s.velocity)*step;s.offset+=s.velocity*step;}
 return s.offset;
}

export function releaseOffsets(count,random=Math.random){
 if(count<2)return Array(count).fill(0);
 const offsets=Array.from({length:count},()=>random()*.3),first=Math.min(...offsets);
 return offsets.map(offset=>offset-first);
}
