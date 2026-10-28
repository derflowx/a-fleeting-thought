const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function internalFlow(x,y,z,time){
 // Smooth, spatially varying eddies (each component is independent of its
 // own axis), plus a rotating, trace-free strain: stretch one axis while
 // squeezing the others. These are forces, never a deformation of the image.
 const angle=time*.27,c=Math.cos(angle),s=Math.sin(angle);
 const u=c*x+s*y,v=-s*x+c*y;
 const strain=.55*Math.sin(time*.76)+.16*Math.sin(time*1.37);
 const su=strain*u,sv=-strain*v*.7;
 return {
  x:c*su-s*sv+30*Math.sin(y*.016+time*.83)*Math.cos(z*.013-time*.31),
  y:s*su+c*sv+28*Math.sin(z*.017+time*.67)*Math.cos(x*.014+time*.24),
  z:-strain*z*.3+24*Math.sin(x*.015-time*.72)*Math.cos(y*.014+time*.36)
 };
}
export function advanceWings(bird,vy,dt){
 // Screen Y points downward: negative velocity means an energetic climb.
 const descent=clamp((vy+3)/22,0,1),glide=descent*descent*(3-2*descent);
 const rate=(13+clamp(-vy,0,160)*.21)*(1-glide);
 bird.wingPhase=(bird.wingPhase??bird.phase??0)+rate*dt;
 const target=1-glide;
 bird.wingStrength=(bird.wingStrength??1)+(target-(bird.wingStrength??1))*(1-Math.exp(-dt*9));
 return bird;
}
