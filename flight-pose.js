// A flight frame in world coordinates: +Y is down, +Z faces the viewer.
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const length=v=>Math.hypot(v.x,v.y,v.z);
const unit=v=>{const n=length(v)||1;return {x:v.x/n,y:v.y/n,z:v.z/n};};
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const reject=(a,b)=>{const d=dot(a,b);return {x:a.x-b.x*d,y:a.y-b.y*d,z:a.z-b.z*d};};
const gravityUp={x:0,y:-1,z:0};
export function advanceFlightPose(bird,dt){
 const velocity={x:bird.vx,y:bird.vy,z:bird.vz??0};
 if(length(velocity)<.01)return bird.flightPose;
 const old=bird.flightPose,target=unit(velocity);
 const forward=old?unit(mix(old.forward,target,1-Math.exp(-dt*12))):target;
 // Transport the previous frame through steep climbs, rather than choosing a
 // new screen-up axis every frame (which flips at vertical flight).
 let transported=reject(old?.up??gravityUp,forward);
 if(length(transported)<.001)transported=reject({x:0,y:0,z:1},forward);
 transported=unit(transported);
 const level=reject(gravityUp,forward),levelStrength=length(level);
 let up=transported;
 if(levelStrength>.001){
  const desired=unit(level),t=(1-Math.exp(-dt*2.5))*levelStrength*levelStrength;
  up=unit(mix(transported,desired,t));
 }
 const right=unit(cross(forward,up));up=unit(cross(right,forward));
 const acceleration=old?{x:(velocity.x-old.velocity.x)/dt,y:(velocity.y-old.velocity.y)/dt,z:(velocity.z-old.velocity.z)/dt}:{x:0,y:0,z:0};
 // Lateral acceleration tilts the lift vector into the turn. Rate limiting
 // removes the nervous roll that neighbour avoidance can otherwise cause.
 const wanted=Math.max(-.95,Math.min(.95,Math.atan2(dot(acceleration,right),100)));
 const bank=(old?.bank??0)+(wanted-(old?.bank??0))*(1-Math.exp(-dt*5));
 bird.flightPose={forward,up,right,bank,velocity};return bird.flightPose;
}
export function flightSilhouette(pose,phase=0,strength=1){
 const {forward:f,up:u,right:r,bank}=pose,c=Math.cos(bank),s=Math.sin(bank);
 const right={x:r.x*c-u.x*s,y:r.y*c-u.y*s,z:r.z*c-u.z*s};
 const up={x:u.x*c+r.x*s,y:u.y*c+r.y*s,z:u.z*c+r.z*s};
 const point=(along,across,lift)=>({x:f.x*along+right.x*across+up.x*lift,y:f.y*along+right.y*across+up.y*lift,z:f.z*along+right.z*across+up.z*lift});
 const flap=Math.sin(phase)*strength,spread=.82+.18*(1-Math.abs(flap));
 const wing=side=>[
  point(.20,side*.13,.02),point(-.03,side*.53*spread,.12+flap*.37),
  point(-.36,side*1.22*spread,.06+flap*.85),
  point(-.55,side*.76*spread,.02+flap*.45),point(-.35,side*.22,0)
 ];
 // The same anatomy in every view; orthographic projection naturally turns
 // a broad wingspan into a swept side view and shortens the body head-on.
 const xx=f.x*f.x*.45**2+right.x*right.x*.14**2+up.x*up.x*.17**2;
 const yy=f.y*f.y*.45**2+right.y*right.y*.14**2+up.y*up.y*.17**2;
 const xy=f.x*f.y*.45**2+right.x*right.y*.14**2+up.x*up.y*.17**2;
 const spreadBody=Math.hypot(xx-yy,2*xy);
 const torso={center:point(-.04,0,-.015),rx:Math.sqrt(Math.max(0,(xx+yy+spreadBody)/2)),ry:Math.sqrt(Math.max(0,(xx+yy-spreadBody)/2)),angle:Math.atan2(2*xy,xx-yy)/2};
 return {torso,wings:[wing(-1),wing(1)],body:[point(.57,0,0),point(.22,.17,-.07),point(-.47,.09,-.05),point(-.70,.19,.02),point(-.61,0,.04),point(-.70,-.19,.02),point(-.47,-.09,-.05),point(.22,-.17,-.07)],head:point(.46,0,.09),beak:point(.76,0,.04)};
}
export function drawFlyingBird(ctx,x,y,size,pose,phase,alpha,strength){
 const shape=flightSilhouette(pose,phase,strength);
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=alpha;
 ctx.fillStyle='#394640';ctx.strokeStyle='#394640';ctx.lineWidth=.085;ctx.lineJoin='round';ctx.lineCap='round';
 const polygon=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();};
 const wings=shape.wings.slice().sort((a,b)=>a[2].z-b[2].z);
 polygon(wings[0]);polygon(shape.body);
 const torso=shape.torso;ctx.beginPath();ctx.ellipse(torso.center.x,torso.center.y,torso.rx,torso.ry,torso.angle,0,Math.PI*2);ctx.fill();
 polygon(wings[1]);
 ctx.beginPath();ctx.arc(shape.head.x,shape.head.y,.14,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.moveTo(shape.head.x,shape.head.y);ctx.lineTo(shape.beak.x,shape.beak.y);ctx.stroke();ctx.restore();
}
