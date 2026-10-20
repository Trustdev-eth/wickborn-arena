// One complete, padded image per fighter. Rendering never samples a neighboring
// atlas cell, even when card, modal and toolbar dimensions differ.
export const SPRITE_ART=Object.freeze(['aaplx','tslax','msftx','googlx','amznx','nvdax','jnjx','metax','jpmx','nflxx','mcdx','hoodx'].map(name=>'/game/characters/'+name+'.png'));
export const spriteUrl=id=>SPRITE_ART[id]||'';

export function spriteMarkup(id,name,cls=''){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<span class="sprite ${escape(cls)}" style="--sprite-art:url('${spriteUrl(id)}');--sprite-art-webp:url('${spriteUrl(id).replace(/\.png$/,'.webp')}')" role="img" aria-label="${escape(name)}"></span>`;
}
export function fitSprite(width,height,size){
 const scale=size/Math.max(width,height);return {width:width*scale,height:height*scale};
}
