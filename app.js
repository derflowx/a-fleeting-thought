import {createViewport,projectPoint,unprojectPoint} from './viewport.js';
import {Tape,seededRandom,encodeReplay,decodeReplay,applyEdit,fitReplayToFlock} from './replay.js';
import {PUBLIC_ORIGIN} from './site-config.js';
import {fitLineScale,centeredLine,smoothAdvance} from './framing.js';
import {advanceWings} from './air.js';
import {drawFlyingBird} from './flight-pose.js';
import {createArrival,stepArrival,createLanding,stepLanding,releaseOffsets} from './arrival.js';
import {Flock,FLOCK_SIZE} from './flock.js';
import {drawMorph,MORPH_DURATION,releaseMotion} from './morph.js';
import {TextModel,reconcile} from './text-model.js';
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
const input=document.querySelector('#writing'),model=new TextModel(360,FLOCK_SIZE,true);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let w=innerWidth,h=innerHeight,dpr=1,time=0,last=performance.now(),letters=[],departures=[],feathers=[],wires=[],fontSize=34,grain,sky,caretOpacity=0,caretLastUsed=-Infinity,baseFontSize=36,lineWidths=[],lineSlots=[],cameraScale=1,targetCameraScale=1,view=createViewport(innerWidth,innerHeight);
let sceneSeed=crypto.getRandomValues(new Uint32Array(1))[0],sceneRandom=seededRandom(sceneSeed),tape=new Tape(sceneSeed),playback=null,loadedReplay=null,accumulator=0;
const rand=(a,b)=>a+sceneRandom()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
let flock=new Flock(FLOCK_SIZE,sceneRandom);
const project=b=>projectPoint(b,view);
function assignBird(l){
 if(/\s/.test(l.char)||l.bird)return;
 const b=flock.borrow();if(!b)return;
 const start=project(b),startScale=b.size*2.1*view.scale/fontSize,flight=createArrival(b);flight.y+=b.size*2.1*.30;Object.assign(l,{bird:b,sx:start.x,sy:start.y,age:0,flight,startScale,startSize:b.size*2.1});
}

function resize(){w=innerWidth;h=innerHeight;view=createViewport(w,h);letters.forEach(l=>{l.lastTarget=null;});dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);sky=ctx.createLinearGradient(0,0,w*.3,h);sky.addColorStop(0,'#d6e1de');sky.addColorStop(.47,'#e4e7dc');sky.addColorStop(1,'#f0e9d8');
 const paper=document.createElement('canvas');paper.width=240;paper.height=240;const p=paper.getContext('2d'),data=p.createImageData(240,240);for(let i=0;i<data.data.length;i+=4){const shade=Math.random()>.5?255:50;data.data[i]=shade;data.data[i+1]=shade;data.data[i+2]=shade;data.data[i+3]=Math.random()*15;}p.putImageData(data,0,0);grain=ctx.createPattern(paper,'repeat');layout();}
function layout(){
 baseFontSize=w<600?27:36;ctx.font=`${baseFontSize}px Georgia`;
 lineWidths=letters.map(l=>(l.targetAdvance=ctx.measureText(l.char).width+1.9));
 targetCameraScale=fitLineScale(lineWidths,w);
 // Keep generous edge space even for an entire pasted thought, while leaving
 // enough room for a gentle camera settle rather than a visible size jump.
 // New character slots open gradually; existing advances retain continuity.
 if(!wires.length)wires.push({energy:0,velocity:0});wires.length=1;
 applyFraming();
}
function applyFraming(){
 fontSize=baseFontSize*cameraScale;
 const positions=centeredLine(lineSlots.map(l=>l.advance??0),w,cameraScale);
 wires[0].y=h*.64-wireSag(w/2);
 lineSlots.forEach((l,i)=>{const p=positions[i];l.row=0;l.tx=p.x;l.ty=wireY(l.tx,0);l.width=p.width;});
}
function updateFraming(dt){
 lineSlots.forEach(l=>{const goal=l.retiring?0:l.targetAdvance??0;l.advance=reduced?goal:smoothAdvance(l.advance??0,goal,dt);});
 lineSlots=lineSlots.filter(l=>!l.retiring||l.advance>.01);
 const speed=targetCameraScale<cameraScale?.24:.55;
 cameraScale=reduced?targetCameraScale:lerp(cameraScale,targetCameraScale,1-Math.exp(-dt/speed));
 cameraScale=Math.min(cameraScale,fitLineScale(lineSlots.map(l=>l.advance??0),w)*1.10);
 applyFraming();
}
function wireSag(x){return Math.sin(Math.PI*x/w)*h*.035*Math.sqrt(cameraScale);}

function wireY(x,row){const wire=wires[row]||wires[0];return wire.y+wireSag(x)+wire.energy*Math.sin(Math.PI*x/w);}
function release(l,delay=0){
 if(/\s/.test(l.char)||!l.bird)return;
 const current=l.render||{x:l.tx,baseline:wireY(l.tx,l.row)-4,morphAge:0,scale:1};
 const x=current.x,y=current.baseline-fontSize*.4+4;
 const world=unprojectPoint({x,y},view);
 flock.returnBird(l.bird,world.x,world.y,rand(-180,180)*l.bird.motionVariation,rand(-260,-180)*l.bird.motionVariation,delay);
 departures.push({bird:l.bird,age:-delay,started:false,seed:l.bird.phase,size:fontSize,worldSize:fontSize/view.scale,char:l.char,morphAge:current.morphAge,scale:current.scale,pose:current.pose||0});
 for(let i=0;i<4;i++)feathers.push({x,y,vx:rand(-70,70),vy:rand(-65,12),age:-delay,life:rand(1.6,3),rot:rand(0,6.28)});
}

model.addEventListener('change',({detail})=>{
 if(!playback&&!['replay','reset'].includes(detail.source))tape.record(detail.previous,detail.text,time,detail.source);
 document.querySelector('#share').disabled=!(tape.events.length||loadedReplay);
 const diff=reconcile(detail.previous,detail.text),removed=letters.slice(diff.start,diff.start+diff.remove);
 const offsets=releaseOffsets(removed.filter(l=>!/\s/.test(l.char)&&l.bird).length,sceneRandom);let releaseIndex=0;
 removed.forEach(l=>{l.retiring=true;release(l,/\s/.test(l.char)||!l.bird?0:offsets[releaseIndex++]);});
 const inserted=diff.insert.map(char=>{const l={char,bird:null,sx:0,sy:0,tx:0,ty:0,age:0,landed:false,seed:rand(0,8)};assignBird(l);return l;});
 letters.splice(diff.start,diff.remove,...inserted);
 const anchor=letters[diff.start+inserted.length],slotIndex=anchor?lineSlots.indexOf(anchor):lineSlots.length;lineSlots.splice(slotIndex<0?lineSlots.length:slotIndex,0,...inserted);layout();
 document.body.classList.toggle('writing',!!detail.text.length);
 if(input.value!==detail.text)input.value=detail.text;
});
function acceptInput(){model.setText(input.value);if(input.value!==model.text)input.value=model.text;}
input.addEventListener('input',e=>{if(!e.isComposing)acceptInput();});input.addEventListener('compositionend',acceptInput);
function revealCaret(){if(!playback)caretLastUsed=performance.now();}
input.addEventListener('beforeinput',e=>{if(e.inputType?.startsWith('insert')&&model.full){e.preventDefault();return;}if(e.inputType?.startsWith('delete'))revealCaret();});
input.addEventListener('keydown',e=>{if(e.key==='Backspace'||e.key==='Delete')revealCaret();});
function revealSelection(){if(document.activeElement===input&&input.selectionStart!==input.selectionEnd)revealCaret();}
input.addEventListener('select',revealSelection);
document.addEventListener('selectionchange',revealSelection);

document.addEventListener('keydown',e=>{if(shareNote.open||e.metaKey||e.ctrlKey||e.altKey||e.key==='Tab'||e.key==='Escape')return;if(document.activeElement!==input&&(e.key.length===1||e.key==='Backspace'||e.key==='Enter'))input.focus({preventScroll:true});});
const shareNote=document.querySelector('#share-note'),shareLink=document.querySelector('#share-link'),shareMessage=document.querySelector('#share-message');
function replayControls(){
 input.readOnly=!!playback;
 document.querySelector('#replay').hidden=!loadedReplay;
 document.querySelector('#share').disabled=!(tape.events.length||loadedReplay);
 
 
}
function resetPerformance(data=null){
 playback=null;model.setText('','reset');
 sceneSeed=data?.seed??crypto.getRandomValues(new Uint32Array(1))[0];sceneRandom=seededRandom(sceneSeed);
 flock=new Flock(FLOCK_SIZE,sceneRandom);letters=[];lineSlots=[];departures=[];feathers=[];wires=[{energy:0,velocity:0}];
 cameraScale=targetCameraScale=1;time=0;accumulator=0;caretLastUsed=-Infinity;caretOpacity=0;tape=new Tape(sceneSeed);
 loadedReplay=data;playback=data?{data,index:0}:null;layout();
 document.querySelector('#invitation h1').textContent=data?'A thought for you.':'Write something.';
 
 document.body.classList.remove('writing');replayControls();
}
function stepReplay(){
 if(!playback)return;
 while(playback&&playback.index<playback.data.events.length&&playback.data.events[playback.index][0]<=time*1000+.01){
  const event=playback.data.events[playback.index++];model.setText(applyEdit(model.text,event),event[4]?'release':'replay');
 }
 if(playback&&playback.index===playback.data.events.length&&time*1000>playback.data.events.at(-1)[0]+6500){
  tape.events=playback.data.events.map(e=>e.slice());tape.start=.7;playback=null;replayControls();
  
 }
}
document.querySelector('#replay').onclick=()=>resetPerformance(loadedReplay);
document.querySelector('#new-thought').onclick=()=>{shareNote.close();history.replaceState(null,'',location.pathname);resetPerformance();input.focus({preventScroll:true});};
document.querySelector('#share-close').onclick=()=>shareNote.close();
async function copyShareLink(){
 try{await navigator.clipboard.writeText(shareLink.value);shareMessage.textContent=/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(shareLink.value)?'Local replay link copied. Public sharing is pending.':'Replay link copied.';}catch{shareLink.focus();shareLink.select();shareMessage.textContent='Select and copy the link below.';}
}
document.querySelector('#copy-link').onclick=copyShareLink;
document.querySelector('#share').onclick=async()=>{
 shareNote.showModal();shareLink.value='';shareMessage.textContent='Preparing your replay…';document.querySelector('#copy-link').disabled=true;
 try{
  const data=playback?loadedReplay:tape.data();const encoded=await encodeReplay(data);
  const local=['localhost','127.0.0.1'].includes(location.hostname),base=local&&PUBLIC_ORIGIN?PUBLIC_ORIGIN:location.origin+location.pathname;
  document.querySelector('#share-privacy').textContent=local&&!PUBLIC_ORIGIN?'This preview link works on this Mac. Public sharing is waiting for publication.':'Anyone with the link can replay the writing, including deleted words. No account needed.';
  shareLink.value=base+'#replay='+encoded;document.querySelector('#copy-link').disabled=false;
  shareMessage.textContent='Your typing, pauses and deletions, carried in a link.';await copyShareLink();
 }catch(error){shareMessage.textContent=error.message;}
};
shareNote.addEventListener('click',e=>{if(e.target===shareNote){const r=shareNote.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shareNote.close();}});

// Adapter for future speech: window.birdwire.setText(transcript, 'speech').
window.birdwire={setText:(text,source='external')=>model.setText(text,source),getText:()=>model.text,getState:()=>({text:model.text,letters:letters.length,arriving:letters.filter(l=>(!l.landed||time-l.landTime<MORPH_DURATION)&&!/\s/.test(l.char)).length,departing:departures.length,rows:wires.length,feathers:feathers.length,population:FLOCK_SIZE,cameraScale,textBounds:letters.length?{left:letters[0].tx-letters[0].width/2,right:letters.at(-1).tx+letters.at(-1).width/2}:null,flock:flock.counts(),waiting:letters.filter(l=>!/\s/.test(l.char)&&!l.bird).length})};
function drawAnimatedBird(item,char,x,baseline,size,age,phase,scale,pose,active){
 drawMorph(ctx,char,x,baseline,size,age,phase,scale,pose,item.bird?.wingStrength??1);
}

function draw(dt){
 updateFraming(dt);
 flock.step(dt);letters.forEach(assignBird);
 flock.birds.forEach(b=>{if(b.state!=='letter')advanceWings(b,b.vy,dt);});
 ctx.globalAlpha=1;ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 // Broad, almost invisible washes give the paper sky a little depth.
 let wash=ctx.createRadialGradient(w*.15,h*.75,0,w*.15,h*.75,w*.75);wash.addColorStop(0,'#fff7df44');wash.addColorStop(1,'#fff7df00');ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
 ctx.fillStyle=grain;ctx.fillRect(0,0,w,h);
 flock.birds.forEach(b=>{if(b.state!=='flock')return;const p=project(b),depth=1+b.z/650;drawFlyingBird(ctx,p.x,p.y,b.size*depth*view.scale,b.flightPose,b.wingPhase,.48+b.size*.065,b.wingStrength);});
 wires.forEach((wire,row)=>{wire.velocity+=(-wire.energy*55-wire.velocity*4.5)*dt;wire.energy+=wire.velocity*dt;
 ctx.beginPath();for(let x=-10;x<=w+10;x+=8){const y=wireY(x,row);if(x===-10)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#414c426c';ctx.lineWidth=.8;ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,wire.y+1.3);ctx.quadraticCurveTo(w*.5,wire.y+wireSag(w/2)*2+wire.energy*2,w,wire.y+1.3);ctx.strokeStyle='#7b806419';ctx.lineWidth=1.8;ctx.stroke();});
 letters.forEach(l=>{
 l.age+=dt;if(/\s/.test(l.char)){l.landed=true;return;}if(!l.bird)return;
 const landingBaseline=wireY(l.tx,l.row)-4,target=unprojectPoint({x:l.tx,y:landingBaseline},view);
 target.vx=l.lastTarget?(target.x-l.lastTarget.x)/dt:0;target.vy=l.lastTarget?(target.y-l.lastTarget.y)/dt:0;l.lastTarget={x:target.x,y:target.y};
 if(!l.landed){
  if(reduced){if(l.age>=.14)Object.assign(l.flight,{x:target.x,y:target.y,vx:0,vy:0,remaining:0,landed:true});}
  else stepArrival(l.flight,target,dt,l.seed);
  if(l.flight.landed){l.landed=true;l.landTime=time;l.landing=createLanding(l.bird.landingVariation,fontSize);wires[l.row].velocity+=(16+fontSize*.12)*l.bird.landingVariation;}
 }
 const bounce=l.landed&&!reduced?stepLanding(l.landing,dt):0;
 const position=project(l.flight),x=l.landed?l.tx:position.x,baseline=l.landed?landingBaseline+bounce:position.y;
 const morphAge=l.landed?(reduced?MORPH_DURATION:time-l.landTime):0;
 const approach=1-l.flight.remaining,scale=l.landed?1:lerp(l.startSize*view.scale/fontSize,1,approach*approach);
 const distance=Math.hypot(target.x-l.flight.x,target.y-l.flight.y);
 const pose=l.landed?0:Math.min(1,distance/35)*Math.sign(l.flight.vx||l.tx-l.sx);
 advanceWings(l.bird,l.landed?0:l.flight.vy,dt);
 l.render={x,baseline,morphAge,scale,pose};
 drawAnimatedBird(l,l.char,x,baseline,fontSize,morphAge,l.bird.wingPhase,scale,pose,!l.landed||morphAge<MORPH_DURATION);
 });
 departures=departures.filter(b=>b.bird.state==='returning');departures.forEach(b=>{b.age+=dt;
 if(b.age<0){const p=project(b.bird),heldSize=b.worldSize*view.scale;drawAnimatedBird(b,b.char,p.x,p.y+heldSize*.4-4,heldSize,b.morphAge,b.bird.wingPhase,b.scale,b.pose,false);return;}
 if(!b.started){b.started=true;if(wires[0])wires[0].velocity-=12;}
 const {unfold,morphAge:age}=releaseMotion(b.morphAge,b.age,reduced);
 const p=project(b.bird);
 const settling=1-Math.exp(-Math.max(0,b.age-.12)*2.5),flockSize=b.bird.size*2.1*(1+b.bird.z/650)*view.scale;
 const size=lerp(b.worldSize*view.scale,flockSize,settling);
 drawAnimatedBird(b,b.char,p.x,p.y+size*.4-4,size,age,b.bird.wingPhase,lerp(b.scale,1,unfold),lerp(b.pose,Math.sign(b.bird.vx),unfold),true);
 });
 feathers=feathers.filter(f=>f.age<f.life);feathers.forEach(f=>{f.age+=dt;if(f.age<0)return;f.x+=f.vx*dt+Math.sin(time*2+f.rot)*7*dt;f.vx*=Math.exp(-1.1*dt);f.vy+=22*dt;f.y+=f.vy*dt;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot+Math.sin(f.age*2)*.7);ctx.globalAlpha=.88*Math.pow(1-Math.min(1,f.age/f.life),.7);ctx.strokeStyle='#303d35';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(-3,0);ctx.quadraticCurveTo(0,-2,3,0);ctx.quadraticCurveTo(0,1,-3,0);ctx.stroke();ctx.restore();});
 ctx.globalAlpha=1;
 // Editing feedback only: no caret during ordinary typing and no blinking.
 const editing=document.activeElement===input&&!shareNote.open&&performance.now()-caretLastUsed<650;
 caretOpacity+=(Number(editing)-caretOpacity)*(1-Math.exp(-dt/(editing?.18:.42)));
 if(caretOpacity>.005){
   const endpoint=input.selectionDirection==='backward'?input.selectionStart:input.selectionEnd;
   const caret=Array.from(input.value.slice(0,endpoint)).length;
   let x=w/2,row=0;
   if(letters.length){
     if(caret<letters.length){const l=letters[caret];x=l.tx-l.width/2-3;row=l.row;}
     else{const l=letters[letters.length-1];x=l.tx+l.width/2+3;row=l.row;if(l.char==='\n'){x=w/2;row=0;}}
   }
   const y=wireY(x,row)-4;ctx.save();ctx.globalAlpha=caretOpacity*.42;ctx.strokeStyle='#455748';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y-fontSize*.78);ctx.lineTo(x,y+2);ctx.stroke();ctx.restore();
 }
}
function frame(now){
 accumulator+=Math.min((now-last)/1000,.1);last=now;
 const step=1/60;
 while(accumulator>=step){stepReplay();time+=step;draw(step);accumulator-=step;}
 if(playback)replayControls();requestAnimationFrame(frame);
}
addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});
addEventListener('resize',resize);resize();
const hash=new URLSearchParams(location.hash.slice(1));
if(hash.has('replay')){
 try{resetPerformance(fitReplayToFlock(await decodeReplay(hash.get('replay'))));}catch(error){document.querySelector('#status').textContent=error.message;}
}else if(hash.has('resume')){
 try{
  const data=fitReplayToFlock(await decodeReplay(hash.get('resume')));resetPerformance(data);playback=null;loadedReplay=null;
  let restored='';for(const event of data.events)restored=applyEdit(restored,event);
  model.setText(restored,'replay');tape.events=data.events.map(e=>e.slice());tape.start=.7-data.events.at(-1)[0]/1000;
  document.querySelector('#invitation h1').textContent='Write something.';replayControls();history.replaceState(null,'',location.pathname);
 }catch(error){document.querySelector('#status').textContent=error.message;}
}else if(hash.has('draft')){model.setText(hash.get('draft'),'external');history.replaceState(null,'',location.pathname);}
last=performance.now();requestAnimationFrame(frame);input.focus({preventScroll:true});
