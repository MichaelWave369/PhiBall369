// The first-party chrome sprite set is self-contained and replaces the old
// vector placeholder parts. Future table packs may override these URLs.
import ball from "./assets/ball.svg?url";
import bumper from "./assets/bumper.svg?url";
import redFlipper from "./assets/flipper-red.svg?url";
import blueFlipper from "./assets/flipper-blue.svg?url";
import target from "./assets/target.svg?url";
import sling from "./assets/slingshot.svg?url";
import ramp from "./assets/ramp-gate.svg?url";

export const SPRITE_URLS=Object.freeze({
  ball,bumper,flipperLeft:redFlipper,flipperRight:blueFlipper,
  target,sling,ramp
});
const cache=new Map();
export function getSprite(name) {
  if(!Object.hasOwn(SPRITE_URLS,name)||typeof Image==="undefined")return null;
  if(!cache.has(name)){
    const image=new Image();
    image.decoding="async";
    image.src=SPRITE_URLS[name];
    cache.set(name,image);
  }
  const image=cache.get(name);
  return image.complete&&image.naturalWidth>0?image:null;
}
export function drawSprite(ctx,name,x,y,w,h) {
  const sprite=getSprite(name);
  if(!sprite)return false;
  ctx.drawImage(sprite,x,y,w,h);
  return true;
}
