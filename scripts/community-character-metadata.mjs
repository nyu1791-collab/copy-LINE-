const ORIGIN='https://rangers.lerico.net';
const LANGUAGES=['ja','en','zh','th'];
const SAFE_ID=/^u\d+e-[a-z0-9_-]+$/i;
const SAFE_CODE=/^[A-Za-z0-9_-]{1,120}$/;
const MAX_CATALOG_BYTES=6*1024*1024;
const MAX_IMAGE_BYTES=32;

function cleanName(value){
 if(typeof value!=='string')return '';
 const name=value.normalize('NFC').replace(/\s+/gu,' ').trim();
 if(!name||name.length>240||/[\u0000-\u001f\u007f<>]/u.test(name))return '';
 return name;
}
function catalogRecord(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
function officialName(catalogs,language,key,id){
 const root=catalogRecord(catalogs?.[language+':UNIT']??catalogs?.[language]);
 if(!root)return '';
 for(const candidate of [key,id+'_nm',id+'_snm']){
  const name=cleanName(root[candidate]);
  if(name&&name!==id)return name;
 }
 return '';
}
export function safeCharacterImageUrl(value,id){
 if(typeof value!=='string'||!SAFE_ID.test(id))return null;
 try{
  const url=new URL(value);
  const expected=ORIGIN+'/res/'+id+'/'+id+'-thum.png';
  if(url.protocol!=='https:'||url.hostname!=='rangers.lerico.net'||url.username||url.password||url.search||url.hash)return null;
  return url.href===expected?url.href:null;
 }catch{return null;}
}
export function verifiedMetadataFromCatalogs(id,basics,catalogs,verifiedAt=new Date().toISOString()){
 if(typeof id!=='string'||!SAFE_ID.test(id)||!Array.isArray(basics))return null;
 const ranger=basics.find(row=>row&&typeof row==='object'&&row.unitCode===id);
 if(!ranger)return null;
 const unitNameCode=typeof ranger.unitNameCode==='string'&&SAFE_CODE.test(ranger.unitNameCode)?ranger.unitNameCode:id+'_nm';
 const name=officialName(catalogs,'ja',unitNameCode,id);
 const nameEn=officialName(catalogs,'en',unitNameCode,id);
 const nameZh=officialName(catalogs,'zh',unitNameCode,id);
 if(!name||!nameEn||!nameZh)return null;
 const nameTh=officialName(catalogs,'th',unitNameCode,id)||null;
 const grade=Number(ranger.grade);
 return {id,name,nameEn,nameZh,nameTh,unitNameCode,stage:'e',grade:Number.isSafeInteger(grade)&&grade>0&&grade<=20?grade:null,transcendent:Number(ranger.isTranscendentUnit)===1,hyper:Number(ranger.isHyperUnit)===1,source:'rangers.lerico.net/api/getRangersBasics',verifiedAt};
}
async function boundedResponseText(response,maxBytes){
 const reader=response.body?.getReader();
 if(!reader){
  const text=await response.text();
  if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error('metadata_too_large');
  return text;
 }
 const chunks=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw new Error('metadata_too_large');}
   chunks.push(value);
  }
 }catch(error){try{await reader.cancel()}catch{}throw error;}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function fetchJson(path,fetchImpl,maxBytes=MAX_CATALOG_BYTES){
 const url=new URL(path,ORIGIN);
 if(url.protocol!=='https:'||url.origin!==ORIGIN)throw new Error('untrusted_metadata_url');
 let lastError;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetchImpl(url.toString(),{headers:{Accept:'application/json','User-Agent':'line-rangers-community-discovery/1.0'},redirect:'error',signal:AbortSignal.timeout(6000)});
   if(!response.ok)throw new Error('metadata_http_'+response.status);
   if(!(response.headers.get('content-type')||'').toLowerCase().includes('json'))throw new Error('metadata_content_type');
   const declared=Number(response.headers.get('content-length')||0);
   if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('metadata_too_large');
   return JSON.parse(await boundedResponseText(response,maxBytes));
  }catch(error){lastError=error;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,250));}
 }
 throw lastError instanceof Error?lastError:new Error('metadata_unavailable');
}
export function createOfficialCharacterVerifier(fetchImpl=fetch){
 let catalogPromise=null;
 async function catalogs(){
  if(!catalogPromise){
   catalogPromise=(async()=>{
    const basicsPromise=fetchJson('/api/getRangersBasics',fetchImpl);
    const languagePromises=LANGUAGES.map(async language=>{
     const path='/api/v2/translate?keys='+encodeURIComponent(language+':UNIT');
     try{return [language,await fetchJson(path,fetchImpl)];}
     catch(error){if(language==='th')return [language,null];throw error;}
    });
    const [basics,languages]=await Promise.all([basicsPromise,Promise.all(languagePromises)]);
    const translations=Object.fromEntries(languages.map(([language,value])=>[language+':UNIT',value?.[language+':UNIT']??value?.[language]??value]));
    return {basics,translations};
   })();
  }
  return catalogPromise;
 }
 return async function verify(id){const source=await catalogs();return verifiedMetadataFromCatalogs(id,source.basics,source.translations);};
}
const imageSignatureChecks=[
 bytes=>bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,
 bytes=>bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value),
 bytes=>bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50,
 bytes=>bytes.length>=6&&bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x38&&(bytes[4]===0x37||bytes[4]===0x39)&&bytes[5]===0x61,
];
function validImageSignature(bytes){return imageSignatureChecks.some(check=>check(bytes));}
export async function probeCharacterImage(url,fetchImpl=fetch){
 let reader;
 try{
  const response=await fetchImpl(url,{headers:{Range:'bytes=0-31','User-Agent':'line-rangers-community-discovery/1.0'},redirect:'error',signal:AbortSignal.timeout(6000)});
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!(response.ok||response.status===206)||!type.startsWith('image/')){await response.body?.cancel();return false;}
  reader=response.body?.getReader();
  if(!reader)return false;
  const chunks=[];let size=0;
  while(size<MAX_IMAGE_BYTES){
   const {done,value}=await reader.read();
   if(done||!value)break;
   const take=value.slice(0,MAX_IMAGE_BYTES-size);chunks.push(take);size+=take.length;
  }
  await reader.cancel().catch(()=>{});
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return validImageSignature(bytes);
 }catch{try{await reader?.cancel()}catch{}return false;}
}
