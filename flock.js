import {internalFlow} from './air.js';
export const FLOCK_SIZE=99;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class Flock {
 constructor(count=FLOCK_SIZE,random=Math.random){
  this.time=0;this.birds=Array.from({length:count},(_,id)=>{const a=random()*Math.PI*2,r=Math.sqrt(random());return {id,state:'flock',x:610+Math.cos(a)*230*r,y:220+Math.sin(a)*120*r,z:(random()-.5)*180,vx:65+random()*30,vy:(random()-.5)*35,vz:(random()-.5)*25,size:2.3+random()*2.8,phase:random()*6.28,motionVariation:.85+random()*.30,landingVariation:.85+random()*.30,returnAge:0};});
 }
 borrow(){const b=this.birds.find(b=>b.state==='flock');if(b)b.state='letter';return b||null;}
 returnBird(b,x,y,vx,vy,delay=0){if(!b||b.state!=='letter')return false;Object.assign(b,{state:'returning',x,y,z:0,vx,vy,vz:0,returnAge:0,returnDelay:Math.max(0,Math.min(.3,delay))});return true;}
 counts(){return this.birds.reduce((a,b)=>(a[b.state]++,a),{flock:0,letter:0,returning:0});}
 center(){const active=this.birds.filter(b=>b.state==='flock');if(!active.length)return {x:610,y:220,z:0,vx:50,vy:0,vz:0};const c={x:0,y:0,z:0,vx:0,vy:0,vz:0};for(const b of active)for(const k in c)c[k]+=b[k]/active.length;return c;}
 step(dt){
  dt=Math.min(dt,.04);this.time+=dt;const active=this.birds.filter(b=>b.state==='flock'),center=this.center(),forces=[];
  const goal={x:580+Math.sin(this.time*.22)*150,y:220+Math.sin(this.time*.31)*65,z:Math.sin(this.time*.19)*50};
  for(const b of active){
   let n=0,px=0,py=0,pz=0,vx=0,vy=0,vz=0,sx=0,sy=0,sz=0;
   for(const other of active){if(other===b)continue;const dx=b.x-other.x,dy=b.y-other.y,dz=b.z-other.z,d2=dx*dx+dy*dy+dz*dz;
    if(d2<150*150){n++;px+=other.x;py+=other.y;pz+=other.z;vx+=other.vx;vy+=other.vy;vz+=other.vz;}
    if(d2<32*32){const safe=Math.max(2,d2);sx+=dx/safe;sy+=dy/safe;sz+=dz/safe;}
   }
   // Reynolds-style local rules: separation, alignment and cohesion.
   let ax=sx*950,ay=sy*950,az=sz*950;
   if(n){ax+=(vx/n-b.vx)*1.3+(px/n-b.x)*.30;ay+=(vy/n-b.vy)*1.3+(py/n-b.y)*.30;az+=(vz/n-b.vz)*1.3+(pz/n-b.z)*.30;}
   // A weak moving roost and banking field keep the flock in the open sky.
   ax+=(goal.x-b.x)*.17-(b.y-center.y)*.14;ay+=(goal.y-b.y)*.25+(b.x-center.x)*.14;az+=(goal.z-b.z)*.22;
   const flow=internalFlow(b.x-center.x,b.y-center.y,b.z-center.z,this.time);
   ax+=flow.x;ay+=flow.y;az+=flow.z;
   if(b.x<100)ax+=(100-b.x)*2;if(b.x>940)ax-=(b.x-940)*2;
   if(b.y<85)ay+=(85-b.y)*2;if(b.y>380)ay-=(b.y-380)*2;
   if(Math.abs(b.z)>160)az-=Math.sign(b.z)*(Math.abs(b.z)-160)*2;
   const mag=Math.hypot(ax,ay,az),scale=mag>150?150/mag:1;forces.push([ax*scale,ay*scale,az*scale]);
  }
  active.forEach((b,i)=>{const f=forces[i];b.vx+=f[0]*dt;b.vy+=f[1]*dt;b.vz+=f[2]*dt;let speed=Math.hypot(b.vx,b.vy,b.vz);if(speed<.001){b.vx=60;speed=60;}const next=clamp(speed,45,120)/speed;b.vx*=next;b.vy*=next;b.vz*=next;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;});
  for(const b of this.birds){if(b.state!=='returning')continue;if(b.returnDelay>0){b.returnDelay-=dt;if(b.returnDelay>0)continue;}b.returnAge+=dt;
   const dx=center.x+center.vx*.35-b.x,dy=center.y+center.vy*.35-b.y,dz=center.z-b.z,dist=Math.hypot(dx,dy,dz)||1;
   const speed=clamp(dist*1.8,100,330)*b.motionVariation,blend=1-Math.exp(-dt*5);
   b.vx+=(dx/dist*speed-b.vx)*blend;b.vy+=(dy/dist*speed-b.vy)*blend;b.vz+=(dz/dist*speed-b.vz)*blend;
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   if(dist<85&&b.returnAge>.35){b.state='flock';const s=Math.hypot(b.vx,b.vy,b.vz)||1;if(s>120){b.vx*=120/s;b.vy*=120/s;b.vz*=120/s;}}
  }
 }
}
