const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Hash the bird's existing identity: repeatable in shared recordings, with no
// extra draws from the simulation's random stream.
export function landingCharacter(bird){
 let state=((bird.id+1)*2654435761^Math.floor(bird.phase*1e6))>>>0;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 const choice=random(),extraFlaps=choice<.42?0:choice<.86?1:2;
 const flapRate=22+random()*10;
 return {extraFlaps,flapRate,settleTime:.07+random()*.13+extraFlaps*Math.PI*2/flapRate,morphRate:.87+random()*.28,facing:random()<.5?-1:1,bow:random()<.70?(.05+random()*.20):0,bowTime:.13+random()*.18,wingBias:.78+random()*.44,headTilt:(random()-.5)*.18};
}
export function landingPerformance(character,age,arrivalPhase=0){
 const t=Math.max(0,age),settled=smooth(t/character.settleTime);
 // Some perch almost immediately, others spend one or two wingbeats finding
 // their balance. The feet are already attached throughout this flourish.
 const wingStrength=character.extraFlaps?1-settled*.55:.45*(1-settled);
 const bow=character.bow*Math.exp(-(((t-character.bowTime)/.16)**2))*smooth(t/.07);
 return {morphAge:Math.max(0,t-character.settleTime)*character.morphRate,phase:arrivalPhase+t*character.flapRate,wingStrength,
  style:{facing:character.facing,bow,headTilt:character.headTilt*Math.sin(Math.min(1,t/.28)*Math.PI),wingBias:character.wingBias}};
}
