import {FLOCK_SIZE} from './flock.js';
import {TextModel,reconcile} from './text-model.js';
export function seededRandom(seed){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};}
export class Tape {
 constructor(seed){this.seed=seed>>>0;this.events=[];this.start=null;}
 record(previous,text,time,source='keyboard'){
  if(previous===text)return;
  if(this.start===null)this.start=time;
  const diff=reconcile(previous,text),at=Math.max(0,Math.round((time-this.start)*1000))+700;
  this.events.push([at,diff.start,diff.remove,diff.insert.join(''),source==='release'?1:0]);
 }
 data(){return {v:1,seed:this.seed,events:this.events};}
}
export function applyEdit(text,event){const chars=Array.from(text);chars.splice(event[1],event[2],...Array.from(event[3]));return chars.join('');}
export function validateReplay(data){
 if(!data||data.v!==1||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff||!Array.isArray(data.events)||!data.events.length||data.events.length>2000)throw Error('This replay link is not supported.');
 let previous=0,text='';for(const e of data.events){if(!Array.isArray(e)||e.length!==5||!Number.isInteger(e[0])||e[0]<previous||e[0]>1800000||!Number.isInteger(e[1])||!Number.isInteger(e[2])||e[1]<0||e[2]<0||typeof e[3]!=='string'||e[3].length>800||![0,1].includes(e[4]))throw Error('This replay link is damaged.');
 const count=Array.from(text).length;if(e[1]>count||e[1]+e[2]>count)throw Error('This replay link is damaged.');text=applyEdit(text,e);
 if(Array.from(text).length>360||Array.from(text).filter(c=>!/\s/.test(c)).length>160||/[\r\n\t\u2028\u2029]/.test(text))throw Error('This replay exceeds the wire.');previous=e[0];}
 return data;
}
async function transform(bytes,stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());}
export async function encodeReplay(data){
 validateReplay(data);const raw=new TextEncoder().encode(JSON.stringify(data));
 const compressed=typeof CompressionStream!=='undefined';const bytes=compressed?await transform(raw,new CompressionStream('deflate')):raw;
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 const encoded=(compressed?'1z.':'1n.')+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(encoded.length>60000)throw Error('This performance is too long for a link. Start a fresh thought.');return encoded;
}
export async function decodeReplay(encoded){
 if(encoded.length>60000||!/^1[zn]\.[\w-]+$/.test(encoded))throw Error('This replay link is damaged.');
 const binary=atob(encoded.slice(3).replaceAll('-','+').replaceAll('_','/')),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 let raw=bytes;
 if(encoded.startsWith('1z.')){
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>250000){await reader.cancel();throw Error('This replay is too large.');}chunks.push(value);}
  raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}
 }
 return validateReplay(JSON.parse(new TextDecoder().decode(raw)));
}

// Older links can contain up to 160 letters. Rebuild their edit patches against
// the current population instead of letting old insertion indexes corrupt text.
export function fitReplayToFlock(data){
 const model=new TextModel(360,FLOCK_SIZE,true),events=[];let original='';
 for(const e of data.events){original=applyEdit(original,e);const previous=model.text;model.setText(original,'replay');
  const edit=reconcile(previous,model.text);if(edit.remove||edit.insert.length)events.push([e[0],edit.start,edit.remove,edit.insert.join(''),e[4]]);
 }
 return {...data,events};
}
