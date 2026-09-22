import {parseRangerInfoData,rangerDetailUrl,validRangerInfoLanguage,validRangerUnitCode,type RangerInfo,type RangerInfoLanguage} from '@/lib/ranger-info';

export const dynamic='force-dynamic';

const pagesOrigin='https://line-rangers-fan.github.io';
const handbookOrigin='https://rangers.lerico.net';
const cacheTtlMs=6*60*60*1000;
const staleCacheTtlMs=7*24*60*60*1000;
const upstreamTimeoutMs=5_000;
const upstreamRetryDelaysMs=[0,350] as const;
const upstreamCacheTtlSeconds=6*60*60;
const durableCacheVersion='v1';
const successCacheControl='public, max-age=21600, stale-if-error=86400';
const staleCacheControl='public, max-age=300, stale-if-error=86400';

type SharedCatalog={expires:number;staleUntil:number;basics:unknown;skills:unknown};
type TranslationCatalog={expires:number;staleUntil:number;value:unknown};
type ResponseCacheEntry={expires:number;staleUntil:number;value:RangerInfo};
type DurableResponseCacheEntry={cachedAt:number;value:RangerInfo};

const responseCache=new Map<string,ResponseCacheEntry>();
let sharedCatalogCache:SharedCatalog|null=null;
let sharedRefreshPromise:Promise<SharedCatalog>|null=null;
const translationCache=new Map<RangerInfoLanguage,TranslationCatalog>();
const translationRefreshPromises=new Map<RangerInfoLanguage,Promise<TranslationCatalog>>();

class UpstreamError extends Error{
 retryable:boolean;
 constructor(message:string,retryable:boolean){
  super(message);
  this.retryable=retryable;
 }
}

function responseHeaders(origin:string|null,cacheControl=successCacheControl){
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

function sleep(ms:number){
 return new Promise((resolve)=>setTimeout(resolve,ms));
}

function validDurableResponseCacheEntry(value:unknown,unit:string,language:RangerInfoLanguage):value is DurableResponseCacheEntry{
 if(!value||typeof value!=='object')return false;
 const entry=value as {cachedAt?:unknown;value?:unknown};
 if(typeof entry.cachedAt!=='number'||!Number.isFinite(entry.cachedAt)||entry.cachedAt<=0)return false;
 if(entry.cachedAt+staleCacheTtlMs<=Date.now())return false;
 if(!entry.value||typeof entry.value!=='object')return false;
 const info=entry.value as Partial<RangerInfo>;
 return info.unitCode===unit
  &&info.language===language
  &&info.sourceUrl===rangerDetailUrl(unit,language)
  &&typeof info.name==='string'
  &&Array.isArray(info.skills);
}

function durableCacheRequest(request:Request,unit:string,language:RangerInfoLanguage){
 const cacheUrl=new URL(request.url);
 cacheUrl.pathname=`/__cache/ranger-info/${durableCacheVersion}/${language}/${unit}`;
 cacheUrl.search='';
 cacheUrl.hash='';
 return new Request(cacheUrl.toString(),{method:'GET'});
}

async function readDurableResponseCache(request:Request,unit:string,language:RangerInfoLanguage){
 try{
  const cached=await caches.default.match(durableCacheRequest(request,unit,language));
  if(!cached||!cached.ok)return null;
  const payload=await cached.json() as unknown;
  return validDurableResponseCacheEntry(payload,unit,language)?payload:null;
 }catch(error){
  console.warn('ranger_info_edge_cache_read_failed',error instanceof Error?error.message:'unknown');
  return null;
 }
}

async function writeDurableResponseCache(request:Request,unit:string,language:RangerInfoLanguage,value:RangerInfo,cachedAt:number){
 try{
  const response=Response.json(
   {cachedAt,value} satisfies DurableResponseCacheEntry,
   {headers:{'Cache-Control':`public, max-age=${Math.floor(staleCacheTtlMs/1000)}`,'Content-Type':'application/json; charset=utf-8'}},
  );
  await caches.default.put(durableCacheRequest(request,unit,language),response);
 }catch(error){
  console.warn('ranger_info_edge_cache_write_failed',error instanceof Error?error.message:'unknown');
 }
}

async function fetchJsonOnce(path:string,maxBytes:number){
 const url=new URL(path,handbookOrigin);
 if(url.protocol!=='https:'||url.hostname!=='rangers.lerico.net')throw new UpstreamError('invalid_source',false);

 let response:Response;
 try{
  response=await fetch(url.toString(),{
   headers:{Accept:'application/json','User-Agent':'line-rangers-pvp-character-detail/1.1'},
   redirect:'follow',
   signal:AbortSignal.timeout(upstreamTimeoutMs),
   cf:{
    cacheEverything:true,
    cacheTtlByStatus:{
     '200-299':upstreamCacheTtlSeconds,
     '400-499':0,
     '500-599':0,
    },
   },
  });
 }catch{
  throw new UpstreamError('upstream_network',true);
 }

 if(!response.ok){
  const retryable=response.status===408||response.status===425||response.status===429||response.status>=500;
  throw new UpstreamError(`upstream_status_${response.status}`,retryable);
 }
 const finalUrl=new URL(response.url);
 if(finalUrl.protocol!=='https:'||finalUrl.hostname!=='rangers.lerico.net')throw new UpstreamError('upstream_redirect',false);
 const contentType=(response.headers.get('content-type')||'').toLowerCase();
 if(!contentType.includes('json'))throw new UpstreamError('upstream_type',false);
 const declared=Number(response.headers.get('content-length')||0);
 if(Number.isFinite(declared)&&declared>maxBytes)throw new UpstreamError('upstream_size',false);
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>maxBytes)throw new UpstreamError('upstream_size',false);
 try{
  return JSON.parse(text) as unknown;
 }catch{
  throw new UpstreamError('upstream_json',false);
 }
}

async function fetchJson(path:string,maxBytes:number){
 let lastError:unknown=null;
 for(let attempt=0;attempt<upstreamRetryDelaysMs.length;attempt+=1){
  const delay=upstreamRetryDelaysMs[attempt];
  if(delay>0)await sleep(delay);
  try{
   return await fetchJsonOnce(path,maxBytes);
  }catch(error){
   lastError=error;
   if(!(error instanceof UpstreamError)||!error.retryable||attempt===upstreamRetryDelaysMs.length-1)throw error;
  }
 }
 throw lastError instanceof Error?lastError:new Error('upstream_unavailable');
}

function translationPath(language:RangerInfoLanguage){
 return `/api/v2/translate?keys=${encodeURIComponent(`${language}:UNIT,${language}:SKILL`)}`;
}

async function sharedCatalogs(){
 const now=Date.now();
 if(sharedCatalogCache&&sharedCatalogCache.expires>now)return sharedCatalogCache;

 if(!sharedRefreshPromise){
  sharedRefreshPromise=(async()=>{
   const [basics,skills]=await Promise.all([
    fetchJson('/api/getRangersBasics',6_000_000),
    fetchJson('/api/getSkills',3_500_000),
   ]);
   const refreshedAt=Date.now();
   const snapshot:SharedCatalog={
    expires:refreshedAt+cacheTtlMs,
    staleUntil:refreshedAt+staleCacheTtlMs,
    basics,
    skills,
   };
   sharedCatalogCache=snapshot;
   return snapshot;
  })().finally(()=>{sharedRefreshPromise=null;});
 }

 try{
  return await sharedRefreshPromise;
 }catch(error){
  if(sharedCatalogCache&&sharedCatalogCache.staleUntil>Date.now()){
   console.warn('ranger_catalog_stale_fallback');
   return sharedCatalogCache;
  }
  throw error;
 }
}

async function translations(language:RangerInfoLanguage){
 const now=Date.now();
 const cached=translationCache.get(language);
 if(cached&&cached.expires>now)return cached.value;

 let refresh=translationRefreshPromises.get(language);
 if(!refresh){
  refresh=(async()=>{
   const value=await fetchJson(translationPath(language),4_000_000);
   const refreshedAt=Date.now();
   const snapshot:TranslationCatalog={
    expires:refreshedAt+cacheTtlMs,
    staleUntil:refreshedAt+staleCacheTtlMs,
    value,
   };
   translationCache.set(language,snapshot);
   return snapshot;
  })().finally(()=>{translationRefreshPromises.delete(language);});
  translationRefreshPromises.set(language,refresh);
 }

 try{
  return (await refresh).value;
 }catch(error){
  const stale=translationCache.get(language);
  if(stale&&stale.staleUntil>Date.now()){
   console.warn('ranger_translation_stale_fallback',language);
   return stale.value;
  }
  throw error;
 }
}

async function catalogs(language:RangerInfoLanguage){
 const [shared,translated]=await Promise.all([
  sharedCatalogs(),
  translations(language),
 ]);
 return {basics:shared.basics,skills:shared.skills,translations:translated};
}

export async function GET(request:Request){
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 const unit=(url.searchParams.get('unit')||'').trim();
 const language=(url.searchParams.get('lang')||'ja').trim();
 if(!validRangerUnitCode(unit)||!validRangerInfoLanguage(language))return json({error:'invalid_request'},400,origin,'no-store');

 const cacheKey=`${language}:${unit}`;
 let existing=responseCache.get(cacheKey);
 if(existing&&existing.expires>Date.now())return json(existing.value,200,origin);

 const durable=await readDurableResponseCache(request,unit,language);
 if(durable){
  const durableEntry:ResponseCacheEntry={
   expires:durable.cachedAt+cacheTtlMs,
   staleUntil:durable.cachedAt+staleCacheTtlMs,
   value:durable.value,
  };
  responseCache.set(cacheKey,durableEntry);
  existing=durableEntry;
  if(durableEntry.expires>Date.now())return json(durableEntry.value,200,origin);
 }

 try{
  const catalog=await catalogs(language);
  const info=parseRangerInfoData(catalog.basics,catalog.skills,catalog.translations,unit,language);
  if(info.sourceUrl!==rangerDetailUrl(unit,language))throw new Error('invalid_source_url');
  if(responseCache.size>=256)responseCache.delete(responseCache.keys().next().value||'');
  const refreshedAt=Date.now();
  responseCache.set(cacheKey,{
   expires:refreshedAt+cacheTtlMs,
   staleUntil:refreshedAt+staleCacheTtlMs,
   value:info,
  });
  await writeDurableResponseCache(request,unit,language,info,refreshedAt);
  return json(info,200,origin);
 }catch(error){
  if(existing&&existing.staleUntil>Date.now()){
   console.warn('ranger_info_stale_fallback',cacheKey);
   return json(existing.value,200,origin,staleCacheControl);
  }
  console.error('ranger_info_unavailable',error instanceof Error?error.message:'unknown');
  return json({error:'unavailable'},503,origin,'no-store');
 }
}
