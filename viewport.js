// One camera for both axes. The flock's world is never resized or rewritten.
export function createViewport(width,height){
 const scale=Math.min(width/1000,height/650);
 return {scale,x:(width-1000*scale)/2,y:(height-650*scale)/2};
}
export function projectPoint(point,view){return {x:view.x+point.x*view.scale,y:view.y+point.y*view.scale};}
export function unprojectPoint(point,view){return {x:(point.x-view.x)/view.scale,y:(point.y-view.y)/view.scale};}
