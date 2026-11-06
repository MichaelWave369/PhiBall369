// Geometry shared by the physics solver, renderer, and diagnostic overlay.
// Keep the lower 16+ units OPEN so balls below flipper reach drain instead of
// wedging into decorative bottom-corner rails.
export const LOWER_RAILS=[
  [.37,.65,10.13,.65],
  [.37,.65,.37,15.35],
  [10.13,.65,10.13,16.93],
  [9.25,3.12,9.25,16.80],
  [9.25,16.86,10.13,16.86],
  [.9,3.8,1.7,2.15],
  [8.7,2.15,9.22,3.2],
  // Slingshots carry the return-guide collisions instead of overlapping rails.
];
export const UPPER_RAILS=[
  [2,2.05,8.6,2.05],[2,2.05,2,10],
  [8.6,2.05,8.6,10],[2,10,8.6,10],
  [2.15,7.1,3.05,8.7],[7.6,7.45,8.2,8.95]
];
// CCW triangles; two independent mechanical sling kickers in the lower deck.
export const SLINGSHOTS=[
  {id:"sling-left",x:2.05,y:13.72,side:"left",
    vertices:[[-.78,-.32],[.77,.20],[-.58,.44]]},
  {id:"sling-right",x:8.45,y:13.72,side:"right",
    vertices:[[.78,-.32],[.58,.44],[-.77,.20]]}
];
export const DRAIN_ZONES=[
  {id:"left-outlane",x:0,y:15.55,w:2.08,h:1.95},
  {id:"middle-drain",x:2.08,y:16.45,w:6.48,h:1.05},
  {id:"right-outlane",x:8.56,y:15.55,w:.69,h:1.95}
];
export function drainZoneAt(x,y) {
  if(x<.16||x>10.55||y>17.12)return "outside-playfield";
  const zone=DRAIN_ZONES.find(z=>x>=z.x&&x<z.x+z.w&&y>=z.y&&y<z.y+z.h);
  return zone?.id ?? null;
}
export function deadCornerAt(x,y) {
  return y>14.65 && ((x<2.08) || (x>8.5&&x<9.25));
}
