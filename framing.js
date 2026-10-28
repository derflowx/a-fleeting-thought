// Center the typographic advance box, rather than a left-anchored text block.
export function fitLineScale(widths,viewport){const total=widths.reduce((a,b)=>a+b,0);return Math.min(1,viewport*.78/Math.max(1,total));}
export function centeredLine(widths,viewport,scale){
 const total=widths.reduce((a,b)=>a+b,0)*scale;let x=(viewport-total)/2;
 return widths.map(width=>{const p={x:x+width*scale/2,width:width*scale,row:0};x+=width*scale;return p;});
}

export function smoothAdvance(current,target,dt){return current+(target-current)*(1-Math.exp(-dt/.22));}
