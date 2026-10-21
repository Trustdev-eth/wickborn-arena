export const PAGE_PATH={
 battle:'/',
 cards:'/fighters',
 forge:'/upgrades',
 ranks:'/rankings',
 profile:'/portfolio',
 tactics:'/skirmish',
 rewards:'/rewards'
};

const PATH_PAGE={
 '/':'battle',
 '/fighters':'cards',
 '/upgrades':'forge',
 '/rankings':'ranks',
 '/portfolio':'profile',
 '/skirmish':'tactics',
 '/tactics':'tactics',
 '/rewards':'rewards'
};

export function normalizePath(path){
 if(!path)return '/';
 const trimmed=String(path).split('?')[0].split('#')[0].replace(/\/+$/,'');
 return trimmed||'/';
}

export function pageFromPath(path){
 return PATH_PAGE[normalizePath(path)]||null;
}

export function pathForPage(page){
 return PAGE_PATH[page]||'/';
}

export function isModifiedNavClick(event,el){
 return !!(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button===1||el?.target==='_blank');
}
