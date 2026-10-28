// The single input boundary. Speech can call model.setText(transcript, 'speech').
export class TextModel extends EventTarget {
  constructor(limit=360,birdLimit=Infinity,singleLine=false){super();this.text='';this.limit=limit;this.birdLimit=birdLimit;this.singleLine=singleLine;this.revision=0;}
  get full(){return Array.from(this.text).filter(c=>!/\s/.test(c)).length>=this.birdLimit;}
  setText(value, source='keyboard') {
    let used=0;
    let normalized=value.replace(/\r\n?/g,'\n');if(this.singleLine)normalized=normalized.replace(/[\n\t\u2028\u2029]/g,' ');
    const replay=source==='replay'||source==='reset';
    if(this.full&&!replay&&reconcile(this.text,normalized).insert.length)return;
    const accepted=[];
    for(const c of Array.from(normalized).slice(0,this.limit)){
      if(!/\s/.test(c)){if(used>=this.birdLimit)continue;used++;}
      accepted.push(c);if(!replay&&used>=this.birdLimit)break;
    }
    const next=accepted.join('');
    if(next===this.text)return;
    const previous=this.text;this.text=next;this.revision++;
    this.dispatchEvent(new CustomEvent('change',{detail:{previous,text:next,source,revision:this.revision}}));
  }
}
export function reconcile(previous,next){
  const a=Array.from(previous),b=Array.from(next);let start=0,end=0;
  while(start<a.length&&start<b.length&&a[start]===b[start])start++;
  while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
  return {start,remove:a.length-start-end,insert:b.slice(start,b.length-end)};
}
export function layoutText(chars,measure,maxWidth){
  // Greedy word wrapping, then character wrapping for words wider than a line.
  const positions=[];let row=0,x=0;
  for(let i=0;i<chars.length;i++){
    const c=chars[i];if(c==='\n'){positions.push({x,row,width:0});row++;x=0;continue;}
    if(c!==' '&&(i===0||/\s/.test(chars[i-1]))){let word=0;for(let j=i;j<chars.length&&!/\s/.test(chars[j]);j++)word+=measure(chars[j]);if(x>0&&x+word>maxWidth){row++;x=0;}}
    const width=measure(c);if(x+width>maxWidth&&x>0){row++;x=0;}
    positions.push({x,row,width});x+=width;
  }
  return {positions,rows:row+1};
}
