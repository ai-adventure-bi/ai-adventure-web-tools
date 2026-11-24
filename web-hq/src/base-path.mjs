// The same build works locally at / and on the shared hub at /web-hq/.
export function baseFromModuleUrl(url){return new URL(url).pathname.match(/^(.*)\/assets\/[^/]+$/)?.[1]||'';}
export const BASE_PATH=typeof document==='undefined'?'':baseFromModuleUrl(import.meta.url);
export const withBase=path=>BASE_PATH+('/'+String(path).replace(/^\//,''));
export function withoutBase(path){return BASE_PATH&&(path===BASE_PATH||path.startsWith(BASE_PATH+'/'))?(path.slice(BASE_PATH.length)||'/'):path;}
