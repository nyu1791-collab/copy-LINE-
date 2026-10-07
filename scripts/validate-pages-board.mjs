import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(process.argv[2]||'dist-pages/boards');
const html=await readFile(join(root,'index.html'),'utf8');
if(!html.includes('board-root')||!html.includes('/line-rangers-pvp/boards/assets/'))throw new Error('Invalid Pages board shell');
if(!html.includes('no-referrer')||!html.includes("object-src 'none'")||!html.includes("script-src 'self'"))throw new Error('Missing board browser protections');
const assets=await readdir(join(root,'assets'));
if(!assets.some(name=>name.endsWith('.js'))||!assets.some(name=>name.endsWith('.css')))throw new Error('Missing board assets');
let javascript='';
for(const name of assets){
 if(name.endsWith('.map'))throw new Error('Production source maps are not public board assets');
 if(!name.endsWith('.js'))continue;
 const source=await readFile(join(root,'assets',name),'utf8');
 if(/BOARD_ANON_COOKIE_SECRET|BOARD_OWNER_ACCESS_TOKEN|CLOUDFLARE_.*TOKEN/.test(source))throw new Error('Server-only configuration found in public board');
 javascript+=source;
}
if(!javascript.includes('line-rangers-pvp-community-production.n-yu1791.workers.dev')||!javascript.includes('X-LR-Viewer'))throw new Error('Pages board API transport missing');
console.log('Verified Pages board paths, assets, signed transport and browser protections.');
