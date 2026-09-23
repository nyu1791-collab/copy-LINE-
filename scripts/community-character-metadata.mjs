const ORIGIN='https://rangers.lerico.net';
const LANGUAGES=['ja','en','zh','th'];
const SAFE_ID=/^u\d+e-[a-z0-9_-]+$/i;
const SAFE_CODE=/^[A-Za-z0-9_-]{1,120}$/;
const MAX_CATALOG_BYTES=6*1024*1024;
const MAX_IMAGE_BYTES=32;
const NOTICE_ORIGIN='https://notice2.line.me';

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
function officialSkillDetails(ranger,skills,catalogs){
 if(!Array.isArray(skills))return null;
 const codes=[ranger.skillCode,ranger.skillCode2,ranger.skillCode3]
  .filter(code=>typeof code==='string'&&SAFE_CODE.test(code))
  .filter((code,index,list)=>list.indexOf(code)===index).slice(0,3);
 if(!codes.length)return null;
 const byCode=new Map(skills.filter(row=>row&&typeof row==='object'&&typeof row.skillCode==='string').map(row=>[row.skillCode,row]));
 for(const code of codes){
  const skill=byCode.get(code);
  if(!skill||typeof skill.iconResourcePath!=='string'||!/^[A-Za-z0-9._-]{1,180}$/.test(skill.iconResourcePath))return null;
  const nameCode=typeof skill.nameCode==='string'&&SAFE_CODE.test(skill.nameCode)?skill.nameCode:code+'_nm';
  const descriptionCode=typeof skill.descriptionCode==='string'&&SAFE_CODE.test(skill.descriptionCode)?skill.descriptionCode:code+'_desc';
  for(const language of ['ja','en','zh']){
   const catalog=catalogRecord(catalogs?.[language+':SKILL']);
   const title=cleanName(catalog?.[nameCode]);
   const description=typeof catalog?.[descriptionCode]==='string'?catalog[descriptionCode].trim():'';
   if(!title||!description||description.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u.test(description))return null;
  }
 }
 return {skillsVerified:true,skillCount:codes.length};
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
export function verifiedMetadataFromCatalogs(id,basics,catalogs,verifiedAt=new Date().toISOString(),skills){
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
 const skillDetails=officialSkillDetails(ranger,skills,catalogs);
 return {id,name,nameEn,nameZh,nameTh,unitNameCode,stage:'e',grade:Number.isSafeInteger(grade)&&grade>0&&grade<=20?grade:null,transcendent:Number(ranger.isTranscendentUnit)===1,hyper:Number(ranger.isHyperUnit)===1,skillsVerified:!!skillDetails,skillCount:skillDetails?.skillCount||0,source:'rangers.lerico.net/api/getRangersBasics',verifiedAt};
}
function releaseMonthJst(timestamp){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).formatToParts(new Date(timestamp));
 const values=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
 return values.year+'-'+values.month;
}
function noticeText(html){
 return String(html||'').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
  .replace(/<\s*\/?(?:div|p|br|li|h[1-6]|section|article)[^>]*>/gi,'\n')
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)))
  .split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
}
function releaseRoster(body){
 const lines=noticeText(body);const heading=lines.findIndex(line=>/\bnew rangers? are here!?(?=\W|$)/i.test(line));
 if(heading<0)return [];
 const roster=[];
 for(const line of lines.slice(heading+1)){
  if(/^notes?\b/i.test(line))break;
  const match=line.match(/^([1-9]\d?)\s*[- ]?Star\s+(.+)$/i);
  if(!match||/\bultimate\s+evolved\b/i.test(match[2]))continue;
  roster.push({grade:Number(match[1]),nameEn:match[2].normalize('NFC').replace(/\s+/g,' ').trim()});
 }
 return [...new Map(roster.map(row=>[row.grade+'\0'+row.nameEn.toLocaleLowerCase('en'),row])).values()];
}
function noticeReleaseMonth(value){
 const timestamp=typeof value==='number'?value:Date.parse(value);
 if(!Number.isFinite(timestamp)||timestamp<1_000_000_000_000) return null;
 return releaseMonthJst(timestamp);
}
async function fetchNoticeJson(url,fetchImpl){
 const response=await fetchImpl(url,{headers:{Accept:'application/json','User-Agent':'line-rangers-community-discovery/1.0'},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('release_notice_http_'+response.status);
 if(!(response.headers.get('content-type')||'').toLowerCase().includes('json'))throw new Error('release_notice_content_type');
 const declared=Number(response.headers.get('content-length')||0);
 if(Number.isFinite(declared)&&declared>1_500_000)throw new Error('release_notice_too_large');
 const result=JSON.parse(await boundedResponseText(response,1_500_000));
 if(!result||typeof result!=='object'||!result.result||typeof result.result!=='object')throw new Error('release_notice_invalid_response');
 return result.result;
}
export async function scanOfficialRangerReleaseNotices(catalogEntries,{fetchImpl=fetch,now=Date.now(),maxPages=8}={}){
 if(!Array.isArray(catalogEntries)||!Number.isFinite(now)||!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>12)throw new Error('invalid_release_notice_scan');
 const currentMonth=releaseMonthJst(now),cutoff=Date.parse(currentMonth+'-01T00:00:00+09:00'),documents=[];let cursor='',lastCursor=null,finished=false,previousRegistered=Infinity;const seenIds=new Set();
 for(let page=0;page<maxPages;page++){
  const url=new URL('/v1/LGRGS/ios/document/notice',NOTICE_ORIGIN);url.searchParams.set('size','50');url.searchParams.set('lang','en');url.searchParams.set('fmt','html');if(cursor)url.searchParams.set('nextSeq',cursor);
  const listed=await fetchNoticeJson(url.toString(),fetchImpl);if(!Array.isArray(listed.documents))throw new Error('release_notice_list_invalid');
  for(const row of listed.documents){
   const id=Number(row?.id),registered=row?.registered;
   if(!Number.isSafeInteger(id)||id<1||typeof registered!=='number'||!Number.isFinite(registered)||typeof row.title!=='string')throw new Error('release_notice_list_item_invalid');
   if(seenIds.has(id)||registered>previousRegistered)throw new Error('release_notice_list_order_changed');
   seenIds.add(id);previousRegistered=registered;
   if(registered>=cutoff&&registered<=now&&/\bnew rangers? are here!?(?=\W|$)/i.test(row.title))documents.push({id,registered,title:row.title});
  }
  if(listed.documents.some(row=>row.registered<cutoff)){finished=true;break;}
  const next=typeof listed.nextSeq==='number'&&listed.nextSeq>0?String(listed.nextSeq):'';
  if(!next||listed.documents.length===0){finished=true;break;}
  if(next===cursor||next===lastCursor)throw new Error('release_notice_cursor_not_advancing');
  lastCursor=cursor;cursor=next;
 }
 if(!finished)throw new Error('release_notice_scan_incomplete');
 const byId=new Map();
 for(const document of documents){
  const url=new URL('/v1/LGRGS/ios/document/notice/'+document.id,NOTICE_ORIGIN);url.searchParams.set('lang','en');url.searchParams.set('fmt','html');
  const detail=await fetchNoticeJson(url.toString(),fetchImpl);
  if(Number(detail.id)!==document.id||typeof detail.body!=='string'||detail.body.length>500_000||Number(detail.registered)!==document.registered||String(detail.title||'').replace(/&amp;/gi,'&')!==document.title.replace(/&amp;/gi,'&'))throw new Error('release_notice_detail_invalid');
  const lines=releaseRoster(detail.body);const month=noticeReleaseMonth(detail.registered??document.registered);if(!month)continue;
  for(const ranger of lines){
   const matches=catalogEntries.filter(entry=>entry&&Number(entry.grade)===ranger.grade&&typeof entry.nameEn==='string'&&entry.nameEn.normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en')===ranger.nameEn.toLocaleLowerCase('en'));
   const unique=[...new Map(matches.filter(entry=>typeof entry.id==='string'&&SAFE_ID.test(entry.id)).map(entry=>[entry.id,entry])).values()];
   if(unique.length!==1)continue;
   const [entry]=unique;const evidence={releaseMonth:month,noticeId:document.id,noticeTitle:document.title,noticeUrl:'https://notice2.line.me/LGRGS/ios/document/notice#'+document.id,publishedAt:new Date(detail.registered??document.registered).toISOString(),catalogId:entry.id,matchedName:ranger.nameEn,grade:ranger.grade,source:'notice2.line.me/LGRGS/ios/document/notice'};
   const prior=byId.get(entry.id);if(!prior||Date.parse(evidence.publishedAt)<Date.parse(prior.publishedAt))byId.set(entry.id,evidence);
  }
 }
 return Object.fromEntries(byId);
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
    const skillsPromise=fetchJson('/api/getSkills',fetchImpl,3_500_000);
    const languagePromises=LANGUAGES.map(async language=>{
     const path='/api/v2/translate?keys='+encodeURIComponent(language+':UNIT,'+language+':SKILL');
     try{return [language,await fetchJson(path,fetchImpl,4_000_000)];}
     catch(error){if(language==='th')return [language,null];throw error;}
    });
    const [basics,skills,languages]=await Promise.all([basicsPromise,skillsPromise,Promise.all(languagePromises)]);
    const translations=Object.fromEntries(languages.flatMap(([language,value])=>[
     [language+':UNIT',value?.[language+':UNIT']??value?.[language]??value],
     [language+':SKILL',value?.[language+':SKILL']??null],
    ]));
    return {basics,skills,translations};
   })();
  }
  return catalogPromise;
 }
 async function verify(id){const source=await catalogs();return verifiedMetadataFromCatalogs(id,source.basics,source.translations,new Date().toISOString(),source.skills);}
 verify.listCatalogUnitIds=async()=>{
  const {basics}=await catalogs();
  if(!Array.isArray(basics))throw new Error('invalid_ranger_catalog');
  return [...new Set(basics.map(row=>row?.unitCode).filter(id=>typeof id==='string'&&SAFE_ID.test(id)))].sort();
 };
 verify.findOfficialReleaseEvidence=async()=>{
  const source=await catalogs();const entries=[];
  for(const ranger of source.basics){
   if(!ranger||typeof ranger!=='object'||typeof ranger.unitCode!=='string')continue;
   const unitNameCode=typeof ranger.unitNameCode==='string'&&SAFE_CODE.test(ranger.unitNameCode)?ranger.unitNameCode:ranger.unitCode+'_nm';
   const nameEn=officialName(source.translations,'en',unitNameCode,ranger.unitCode);const grade=Number(ranger.grade);
   if(nameEn&&Number.isSafeInteger(grade))entries.push({id:ranger.unitCode,nameEn,grade});
  }
  return scanOfficialRangerReleaseNotices(entries,{fetchImpl});
 };
 return verify;
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
