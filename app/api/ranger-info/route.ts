import {parseRangerInfoData,rangerDetailUrl,validRangerUnitCode,type RangerInfo} from '@/lib/ranger-info';

export const dynamic='force-dynamic';

const pagesOrigin='https://line-rangers-fan.github.io';
const handbookOrigin='https://rangers.lerico.net';
const basicsUrl=handbookOrigin+'/api/getRangersBasics';
const skillsUrl=handbookOrigin+'/api/getSkills';
const translationsUrl=handbookOrigin+'/api/v2/translate?keys=ja%3ASKILL%2Cja%3AUNIT';
const maxJsonBytes=8*1024*1024;
const cache=new Map<string,{expires:number,value:RangerInfo}>();
const cacheTtlMs=6*60*60*1000;

function responseHeaders(origin:string|null,cacheControl='public, max-age=300'){
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

async function fetchJsonBounded(url:string){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.origin!==handbookOrigin)throw new Error('invalid_source');
 const response=await fetch(url,{
  headers:{Accept:'application/json','User-Agent':'line-rangers-pvp-character-detail/2.0'},
  redirect:'follow',
  signal:AbortSignal.timeout(8000),
 });
 if(!response.ok)throw new Error('upstream_status');
 const finalUrl=new URL(response.url);
 if(finalUrl.protocol!=='https:'||finalUrl.origin!==handbookOrigin)throw new Error('upstream_redirect');
 const type=(response.headers.get('content-type')||'').toLowerCase();
 if(!type.includes('json'))throw new Error('upstream_type');
 const length=Number(response.headers.get('content-length')||0);
 if(Number.isFinite(length)&&length>maxJsonBytes)throw new Error('upstream_size');
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>maxJsonBytes)throw new Error('upstream_size');
 return JSON.parse(text) as unknown;
}

export async function GET(request:Request){
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 const unit=(url.searchParams.get('unit')||'').trim();
 if(!validRangerUnitCode(unit))return json({error:'invalid_request'},400,origin,'no-store');
 const existing=cache.get(unit);
 if(existing&&existing.expires>Date.now())return json(existing.value,200,origin);
 try{
  rangerDetailUrl(unit);
  const [basics,skills,translations]=await Promise.all([
   fetchJsonBounded(basicsUrl),
   fetchJsonBounded(skillsUrl),
   fetchJsonBounded(translationsUrl),
  ]);
  const parsed=parseRangerInfoData(basics,skills,translations,unit);
  if(cache.size>=128)cache.delete(cache.keys().next().value||'');
  cache.set(unit,{expires:Date.now()+cacheTtlMs,value:parsed});
  return json(parsed,200,origin);
 }catch{
  console.error('ranger_info_unavailable');
  return json({error:'unavailable'},503,origin,'no-store');
 }
}
