// Continuous 2.5D rail geometry. The ball has an explicit X/Y/Z on a ramp.
// Planck still solves each flat deck; guided spline transit owns only the
// connecting segment. No claim of free 3D rigid-body collision on ramps.
export const DECK_Z=Object.freeze([0,1.35]);
const STEPS=80;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const height=layer=>DECK_Z[layer===1?1:0];

function mix(a,b,t){return a+(b-a)*t;}
function point(x,y,z){return {x,y,z};}
function bezier(a,b,c,d,t) {
  const q=1-t;
  return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d;
}
function segmentDistance(a,b){
  return Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
}
function unit(a,b){
  const size=Math.max(1e-6,segmentDistance(a,b));
  return {x:(b.x-a.x)/size,y:(b.y-a.y)/size,z:(b.z-a.z)/size};
}
export function makeRampTrack(ramp,actualStart=null) {
  if(ramp?.type!=="ramp"||ramp.layer===ramp.toLayer)
    throw new Error("Ramp must connect two different elevations.");
  const fromZ=height(ramp.layer),toZ=height(ramp.toLayer);
  const p0=point(actualStart?.x??ramp.x,actualStart?.y??ramp.y,fromZ);
  const p3=point(ramp.toX,ramp.toY,toZ);
  const dx=ramp.toX-ramp.x,dy=ramp.toY-ramp.y;
  const length=Math.max(.01,Math.hypot(dx,dy));
  const curvature=clamp(Number.isFinite(ramp.curve)?ramp.curve:.4,-1.5,1.5);
  const nx=-dy/length,ny=dx/length;
  // Curved side rails keep the same track centerline as the ball.
  const p1=point(
    clamp(mix(ramp.x,ramp.toX,.32)+nx*curvature,.5,10),
    clamp(mix(ramp.y,ramp.toY,.32)+ny*curvature,.75,16.8),
    mix(fromZ,toZ,.12)
  );
  const p2=point(
    clamp(mix(ramp.x,ramp.toX,.68)+nx*curvature,.5,10),
    clamp(mix(ramp.y,ramp.toY,.68)+ny*curvature,.75,16.8),
    mix(fromZ,toZ,.88)
  );
  const control=[p0,p1,p2,p3];
  const nodes=[];
  let total=0,previous=null;
  for(let i=0;i<=STEPS;i++){
    const t=i/STEPS;
    const p=point(...["x","y","z"].map(k=>bezier(p0[k],p1[k],p2[k],p3[k],t)));
    if(previous)total+=segmentDistance(previous,p);
    nodes.push({...p,t,distance:total});
    previous=p;
  }
  return {ramp,control,nodes,totalLength:total,fromZ,toZ};
}
export function sampleRamp(track,distance){
  const nodes=track.nodes;
  if(!nodes.length)throw new Error("Empty ramp track.");
  const d=clamp(Number.isFinite(distance)?distance:0,0,track.totalLength);
  let lo=0,hi=nodes.length-1;
  while(hi-lo>1) {
    const mid=(lo+hi)>>1;
    if(nodes[mid].distance<d)lo=mid;else hi=mid;
  }
  const a=nodes[lo],b=nodes[hi],length=Math.max(1e-6,b.distance-a.distance);
  const u=clamp((d-a.distance)/length,0,1);
  const tangent=unit(a,b);
  return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),
    z:mix(a.z,b.z,u),t:mix(a.t,b.t,u),tangent};
}
