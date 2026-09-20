import {buildRangerInfo,rangerDetailUrl,validRangerUnitCode,type RangerInfo} from '@/lib/ranger-info';

export const dynamic='force-dynamic';

const pagesOrigin='https://line-rangers-fan.github.io';
const handbookOrigin='https://rangers.lerico.net';
const cacheTtlMs=6*60*60*1000;
const responseCache=new Map<string,{expires:number,value:RangerInfo}>();
let catalogCache:{expires:number;basics:unknown;skills:unknown;translations:unknown}|null=null;

function responseHeaders(origin:string|null,cacheControl='public, max-age=21600'){
 const headers:Record<string,string>={
  'Cache-Control':cacheControl,
  'X-Content-Type-Options':'nosniff',
  'Vary':'Origin',
 };
 if(origin===pagesOrigin)headers['Access-Control-Allow-Origin']=pagesOrigin;
 return headers;
}
function json(data:unknown,status:number,origin:string|null,cacheControl?:string){
 return Response.json(data,{status,headers:responseHeaders(origin,cacheControl)});
}
export async function OPTIONS(request:Request){
 const origin=request.headers.get('origin');
 if(origin!==pagesOrigin)return new Response(null,{status:403,headers:{'Cache-Control':'no-store','Vary':'Origin'}});
 return new Response(null,{status:204,headers:{...responseHeaders(origin,'no-store'),'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept'}});
}

async function fetchJson(path:string,maxBytes:number){
 const url=new URL(path,handbookOrigin);
 if(url.protocol!=='https:'||url.hostname!=='rangers.lerico.net')throw new Error('invalid_source');
 const response=await fetch(url.toString(),{
  headers:{Accept:'application/json','User-Agent':'line-rangers-pvp-character-detail/1.0'},
  redirect:'follow',
  signal:AbortSignal.timeout(10_000),
 });
 if(!response.ok)throw new Error('upstream_status');
 const finalUrl=new URL(response.url);
 if(finalUrl.protocol!=='https:'||finalUrl.hostname!=='rangers.lerico.net')throw new Error('upstream_redirect');
 const contentType=(response.headers.get('content-type')||'').toLowerCase();
 if(!contentType.includes('json'))throw new Error('upstream_type');
 const declared=Number(response.headers.get('content-length')||0);
 if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('upstream_size');
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error('upstream_size');
 return JSON.parse(text) as unknown;
}

async function catalogs(){
 const now=Date.now();
 if(catalogCache&&catalogCache.expires>now)return catalogCache;
 const [basics,skills,translations]=await Promise.all([
  fetchJson('/api/getRangersBasics',6_000_000),
  fetchJson('/api/getSkills',3_500_000),
  fetchJson('/api/v2/translate?keys=ja%3AUNIT%2Cja%3ASKILL',2_000_000),
 ]);
 catalogCache={expires:now+cacheTtlMs,basics,skills,translations};
 return catalogCache;
}

export async function GET(request:Request){
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 const unit=(url.searchParams.get('unit')||'').trim();
 if(!validRangerUnitCode(unit))return json({error:'invalid_request'},400,origin,'no-store');

 const existing=responseCache.get(unit);
 if(existing&&existing.expires>Date.now())return json(existing.value,200,origin);
 try{
  const catalog=await catalogs();
  const info=buildRangerInfo(unit,catalog.basics,catalog.skills,catalog.translations);
  if(info.sourceUrl!==rangerDetailUrl(unit))throw new Error('invalid_source_url');
  if(responseCache.size>=128)responseCache.delete(responseCache.keys().next().value||'');
  responseCache.set(unit,{expires:Date.now()+cacheTtlMs,value:info});
  return json(info,200,origin);
 }catch{
  console.error('ranger_info_unavailable');
  return json({error:'unavailable'},503,origin,'no-store');
 }
}
