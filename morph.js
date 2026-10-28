import {glyphs} from './glyphs.js';
// Six filled vector silhouettes. Every point survives the entire bird → glyph
// transition; opacity is constant. The feet meet the wire at y=0.
const parts=[
 [[-.07,-.36],[-.24,-.53],[-.55,-.58],[-.39,-.38],[-.2,-.26],[-.06,-.27]],
 [[.06,-.37],[.21,-.55],[.51,-.65],[.38,-.39],[.19,-.25],[.05,-.26]],
 [[-.075,-.12],[-.055,-.025],[-.14,-.012],[-.15,.008],[-.035,.007],[-.025,-.13]],
 [[.035,-.13],[.055,-.015],[.14,.005],[.15,-.012],[.08,-.04],[.075,-.14]],
 [[-.09,-.08],[-.15,-.21],[-.13,-.36],[-.07,-.46],[.01,-.49],[.09,-.44],[.12,-.35],[.08,-.23],[.025,-.13],[-.02,-.08],[-.09,.01],[-.07,-.09]],
 [[.08,-.43],[.23,-.395],[.09,-.36]]
];
// Side-on approach: swept wings, horizontal body, trailing tucked feet.
const flyingParts=[
 [[-.03,-.32],[-.20,-.51],[-.43,-.64],[-.29,-.37],[-.09,-.26]],
 [[.01,-.32],[.07,-.53],[.22,-.68],[.18,-.40],[.09,-.27]],
 [[-.12,-.25],[-.19,-.22],[-.28,-.24],[-.27,-.22],[-.17,-.19],[-.09,-.22]],
 [[-.06,-.24],[-.11,-.20],[-.20,-.20],[-.21,-.18],[-.09,-.17],[.01,-.23]],
 [[-.39,-.24],[-.27,-.32],[-.15,-.36],[.02,-.35],[.12,-.42],[.20,-.41],[.24,-.35],[.22,-.29],[.14,-.27],[.05,-.22],[-.13,-.21],[-.25,-.25]],
 [[.22,-.36],[.37,-.33],[.22,-.31]]
];
const cache=new Map(),N=96;
const mix=(a,b,t)=>a+(b-a)*t;
const area=p=>p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v[0]*n[1]-n[0]*v[1];},0)/2;
function clip(poly,axis,value,keepGreater){let out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=keepGreater?a[axis]>=value:a[axis]<=value,ib=keepGreater?b[axis]>=value:b[axis]<=value;if(ia)out.push(a);if(ia!==ib){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([mix(a[0],b[0],t),mix(a[1],b[1],t)]);}}return out;}
function sample(poly){const lengths=poly.map((p,i)=>Math.hypot(p[0]-poly[(i+1)%poly.length][0],p[1]-poly[(i+1)%poly.length][1]));const perimeter=lengths.reduce((a,b)=>a+b,0);let edge=0,start=0;return Array.from({length:N},(_,i)=>{const d=i/N*perimeter;while(edge<lengths.length-1&&start+lengths[edge]<d)start+=lengths[edge++];const t=lengths[edge]?(d-start)/lengths[edge]:0,a=poly[edge],b=poly[(edge+1)%poly.length];return [mix(a[0],b[0],t),mix(a[1],b[1],t)];});}
function align(source,target){if(Math.sign(area(source))!==Math.sign(area(target)))source=source.slice().reverse();let best=0,cost=Infinity;const center=p=>p.reduce((a,v)=>[a[0]+v[0]/N,a[1]+v[1]/N],[0,0]),sc=center(source),tc=center(target);for(let shift=0;shift<N;shift++){let sum=0;for(let i=0;i<N;i++){const s=source[(i+shift)%N],t=target[i];sum+=(s[0]-sc[0]-t[0]+tc[0])**2+(s[1]-sc[1]-t[1]+tc[1])**2;}if(sum<cost){cost=sum;best=shift;}}return source.map((_,i)=>source[(i+best)%N]);}
const fallback={width:.58,rings:[[[-.23,0],[-.23,-.7],[.23,-.7],[.23,0]],[[-.18,-.05],[.18,-.05],[.18,-.65],[-.18,-.65]]]};
// Partition in a smoothly warped coordinate system instead of rectangular
// bands. Inverting the shear bends every internal join into an organic seam.
const warp=([x,y])=>{const u=x+.075*Math.sin(y*9);return [u,y+.045*Math.sin(u*11)];};
const unwarp=([u,v])=>{const y=v-.045*Math.sin(u*11);return [u-.075*Math.sin(y*9),y];};
function dense(poly){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.012));for(let j=0;j<n;j++)out.push([mix(a[0],b[0],j/n),mix(a[1],b[1],j/n)]);}return out;}
export function geometry(char){if(cache.has(char))return cache.get(char);const glyph=glyphs[char]?.rings.length?glyphs[char]:fallback;const warped=glyph.rings.map(r=>dense(r).map(warp));const points=warped.flat();const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));const height=bottom-top||.7;
 const regions=[[-1,0,top-1,top+height*.37],[0,1,top-1,top+height*.37],[-1,0,top+height*.76,bottom+1],[0,1,top+height*.76,bottom+1],[-1,0,top+height*.37,top+height*.76],[0,1,top+height*.37,top+height*.76]];
 const output=regions.map(([left,right,up,down],index)=>{
   const rings=warped.map(r=>clip(clip(clip(clip(r,0,left,true),0,right,false),1,up,true),1,down,false)).filter(r=>r.length>2&&Math.abs(area(r))>.000001).sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));
   if(!rings.length){const anchor=parts[index][0];return [{source:sample(parts[index]),target:Array.from({length:N},()=>[mix(left,right,.5),Math.min(0,down)]),vanish:true}];}
   return rings.map((ring,i)=>{const target=sample(dense(ring).map(unwarp));let source;if(i===0)source=align(sample(parts[index]),target);else{const center=parts[index].reduce((a,p)=>[a[0]+p[0]/parts[index].length,a[1]+p[1]/parts[index].length],[0,0]);source=Array.from({length:N},()=>center);}return {source,target};});
 });
 output.forEach((rings,index)=>rings.forEach((ring,i)=>{ring.flying=i===0?align(sample(flyingParts[index]),ring.source):Array.from({length:N},()=>flyingParts[index][0]);}));
 cache.set(char,output);return output;}
export const PART_DURATIONS=[.65,.65,.325,.325,.325,.325];
const delays=[0,.06,.11,.155,.215,.27];
export const MORPH_DURATION=.71;
export function partProgress(elapsed,index){
 const t=Math.max(0,Math.min(1,(elapsed-delays[index])/PART_DURATIONS[index]));
 if(t===0||t===1)return t;
 if(index<2)return 1-Math.pow(1-t,7)+Math.sin(t*Math.PI*3)*.025*Math.pow(1-t,2);
 return 1-Math.pow(1-t,3);
}
export function releaseMotion(initialMorphAge,age,reduced=false){
 const unfold=Math.min(1,Math.max(0,age)/(reduced?.06:.16));
 return {unfold,flight:Math.max(0,age),morphAge:Math.min(MORPH_DURATION,initialMorphAge)*(1-unfold)};
}
export function drawMorph(ctx,char,x,baseline,size,elapsed,phase=0,flightScale=1,flightPose=0,wingStrength=1,style={}){
 const shapes=geometry(char);ctx.save();ctx.translate(x,baseline);ctx.fillStyle='#303d35';ctx.strokeStyle='#303d35';ctx.lineWidth=.18;ctx.lineJoin='round';
 // Once all pieces share their exact destination, fill the joined outline in
 // one operation to remove antialias seams along the six internal cuts.
 if(elapsed>=MORPH_DURATION){const glyph=glyphs[char]?.rings.length?glyphs[char]:fallback;ctx.beginPath();for(const ring of glyph.rings){ring.forEach((p,i)=>{if(i===0)ctx.moveTo(p[0]*size,p[1]*size);else ctx.lineTo(p[0]*size,p[1]*size);});ctx.closePath();}ctx.fill('evenodd');ctx.restore();return;}
 shapes.forEach((rings,index)=>{const t=partProgress(elapsed,index),fold=Math.max(0,1-t),flap=(Math.sin(phase)*wingStrength-.12*(1-wingStrength))*(.20+.5*Math.abs(flightPose))*fold;ctx.beginPath();
 for(const ring of rings){ring.source.forEach((s,j)=>{const target=ring.target[j];const pose=Math.abs(flightPose)*Math.max(0,1-t),facing=flightPose<0?-1:1;let sx=mix(s[0]*(style.facing??1),ring.flying[j][0]*facing,pose)*flightScale,sy=mix(s[1],ring.flying[j][1],pose)*flightScale;
 if(index<2){const glide=(1-wingStrength)*Math.abs(flightPose);sy=mix(sy,-.32*flightScale+(sy+.32*flightScale)*.28,glide);sx*=1+glide*.18;const side=index===0?-1:1;const hinge=side*.06;const a=flap*side*(index===0?(style.wingBias??1):2-(style.wingBias??1)),dx=sx-hinge,dy=sy+.30*flightScale;sx=hinge+dx*Math.cos(a)-dy*Math.sin(a);sy=-.30*flightScale+dx*Math.sin(a)+dy*Math.cos(a);}
 // A small breast/head dip pivots above the feet, never displacing the
 // attachment point. Personality affects only the bird, not the target glyph.
 if(index<2||index>=4){const tilt=((style.bow??0)+(index===5?(style.headTilt??0):0))*(style.facing??1)*(1-Math.abs(flightPose));const dx=sx,dy=sy+.16*flightScale;sx=dx*Math.cos(tilt)-dy*Math.sin(tilt);sy=-.16*flightScale+dx*Math.sin(tilt)+dy*Math.cos(tilt);}
 const px=mix(sx,target[0],t)*size,py=mix(sy,target[1],t)*size;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.closePath();}
 ctx.fill('evenodd'); // Single path per anatomical part preserves letter counters.
 });ctx.restore();
}
