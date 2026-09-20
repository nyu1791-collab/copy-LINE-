import {parseRangerInfoHtml,rangerDetailUrl,validRangerUnitCode,type RangerInfo} from '@/lib/ranger-info';

export const dynamic='force-dynamic';

const pagesOrigin='https://line-rangers-fan.github.io';
const maxHtmlBytes=900_000;
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
export async function GET(request:Request){
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 const unit=(url.searchParams.get('unit')||'').trim();
 if(!validRangerUnitCode(unit))return json({error:'invalid_request'},400,origin,'no-store');
 const existing=cache.get(unit);
 if(existing&&existing.expires>Date.now())return json(existing.value,200,origin);
 try{
  const sourceUrl=rangerDetailUrl(unit);
  const source=new URL(sourceUrl);
  if(source.protocol!=='https:'||source.hostname!=='rangers.lerico.net')throw new Error('invalid_source');
  const upstream=await fetch(sourceUrl,{headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'line-rangers-pvp-character-detail/1.0'},redirect:'follow',signal:AbortSignal.timeout(8000)});
  if(!upstream.ok)throw new Error('upstream_status');
  const finalUrl=new URL(upstream.url);
  if(finalUrl.protocol!=='https:'||finalUrl.hostname!=='rangers.lerico.net')throw new Error('upstream_redirect');
  const contentType=upstream.headers.get('content-type')||'';
  if(!contentType.toLowerCase().includes('text/html'))throw new Error('upstream_type');
  const contentLength=Number(upstream.headers.get('content-length')||0);
  if(Number.isFinite(contentLength)&&contentLength>maxHtmlBytes)throw new Error('upstream_size');
  const html=await upstream.text();
  if(new TextEncoder().encode(html).byteLength>maxHtmlBytes)throw new Error('upstream_size');
  const parsed=parseRangerInfoHtml(html,unit);
  if(!parsed.skills.length)throw new Error('skills_missing');
  if(cache.size>=128)cache.delete(cache.keys().next().value||'');
  cache.set(unit,{expires:Date.now()+cacheTtlMs,value:parsed});
  return json(parsed,200,origin);
 }catch{
  console.error('ranger_info_unavailable');
  return json({error:'unavailable'},503,origin,'no-store');
 }
}
