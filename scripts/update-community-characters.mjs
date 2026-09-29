import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createOfficialCharacterVerifier,probeCharacterImage,safeCharacterImageUrl} from './community-character-metadata.mjs';
import {auditCommunityDiscoveryLog,normalizeCommunityDiscoveryLog,promotionLogEvent} from './community-discovery-log.mjs';

const SNAPSHOT=resolve('public/pvp/data/character_usage.json');
const HISTORY=resolve('public/pvp/data/character_usage_history.json');
const REGISTRY=resolve('config/community-characters.json');
const LEGACY_KNOWN=resolve('config/community-known-legacy-ids.json');
const STATE=resolve('data/community-character-discovery.json');
const DISCOVERY_LOG=resolve('data/community-character-discovery-log.json');
const TARGET=200;
const REQUIRED_CONSECUTIVE=3;
// GitHub may skip scheduled slots; require three distinct full snapshots in
// sequence while allowing the scheduled collector to recover within a day.
const MAX_GAP_MS=24*60*60*1000;
const SAFE_ID=/^u\d+e-[a-z0-9_-]+$/i;

export async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error&&typeof error==='object'&&error.code==='ENOENT')return fallback;throw error;}}
async function atomicJson(path,value){await mkdir(dirname(path),{recursive:true});const temp=`${path}.tmp`;await writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');await rename(temp,path);}
function monthJST(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw new Error('invalid snapshot date');const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).formatToParts(date);const values=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${values.year}-${values.month}`;}
function safeImage(value,id){return safeCharacterImageUrl(value,id);}
function currentRows(snapshot){if(!snapshot||snapshot.complete_target!==true||snapshot.target_players!==TARGET||snapshot.sampled_players!==TARGET||!Array.isArray(snapshot.characters))throw new Error('refusing incomplete PvP snapshot');const rows=snapshot.characters;if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)))throw new Error('invalid character row in full PvP snapshot');if(new Set(rows.map(row=>row.unit_code)).size!==rows.length)throw new Error('duplicate character ID in full PvP snapshot');return rows;}
function historyIds(history){const output=new Set();for(const snapshot of Array.isArray(history?.snapshots)?history.snapshots:[]){for(const row of Array.isArray(snapshot?.characters)?snapshot.characters:[]){if(row&&typeof row.unit_code==='string')output.add(row.unit_code);}}return output;}
function knownLegacyIds(raw){return new Set((Array.isArray(raw?.ids)?raw.ids:[]).filter(id=>typeof id==='string'&&/^u\d+[a-z]?-[a-z0-9_-]+$/i.test(id)));}
export function normalizeRegistry(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==1||!Array.isArray(raw.characters))throw new Error('invalid community topic registry');const seen=new Set();const clean=[];for(const row of raw.characters){if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.id)||typeof row.name!=='string'||!row.name.trim()||[...row.name].length>80||typeof row.image!=='string'||!row.image.trim()||typeof row.releaseMonth!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(row.releaseMonth)||row.confirmed!==true)throw new Error('invalid community topic in registry');const key=`${row.releaseMonth}:${row.id}`;if(seen.has(key))throw new Error('duplicate community topic in registry');seen.add(key);clean.push({...row});}return {schemaVersion:1,characters:clean};}
export function normalizeDiscoveryState(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==1||typeof raw.initialized!=='boolean'||!Array.isArray(raw.knownIds)||!raw.candidates||typeof raw.candidates!=='object'||Array.isArray(raw.candidates))throw new Error('invalid community discovery state');if(raw.catalogInitialized!==undefined&&typeof raw.catalogInitialized!=='boolean')throw new Error('invalid community discovery catalog state');if(raw.knownCatalogIds!==undefined&&!Array.isArray(raw.knownCatalogIds))throw new Error('invalid known Ranger catalog IDs');if(raw.lastSnapshotAt!=null&&(typeof raw.lastSnapshotAt!=='string'||!Number.isFinite(Date.parse(raw.lastSnapshotAt))))throw new Error('invalid community discovery snapshot timestamp');return raw;}
function validateOfficialMetadata(value,id){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.id!==id||value.stage!=='e')return null;
 const name=candidateName({name:value.name,unit_code:id});
 const nameEn=candidateName({name:value.nameEn,unit_code:id});
 const nameZh=candidateName({name:value.nameZh,unit_code:id});
 const nameTh=value.nameTh==null?null:candidateName({name:value.nameTh,unit_code:id});
 if(!name||!nameEn||!nameZh||!nameTh||typeof value.unitNameCode!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(value.unitNameCode)||value.skillsVerified!==true||!Number.isSafeInteger(value.skillCount)||value.skillCount<1||value.skillCount>3||!Number.isFinite(Date.parse(value.verifiedAt)))return null;
 return {id,name,nameEn,nameZh,nameTh,unitNameCode:value.unitNameCode,stage:'e',grade:Number.isSafeInteger(value.grade)?value.grade:null,skillsVerified:true,skillCount:value.skillCount,source:'rangers.lerico.net/api/getRangersBasics',verifiedAt:value.verifiedAt};
}
function candidateName(row){const value=typeof row.name==='string'?row.name.normalize('NFC').replace(/\s+/g,' ').trim():'';return value&&value!==row.unit_code&&[...value].length<=80?value:null;}
function snapshotRank(row){return Number.isSafeInteger(row.rank)&&row.rank>0?row.rank:null;}
function adoptionRate(row){return typeof row.adoption_rate==='number'&&Number.isFinite(row.adoption_rate)&&row.adoption_rate>=0&&row.adoption_rate<=100?row.adoption_rate:null;}
function validReleaseEvidence(value,id){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.catalogId===id&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(value.releaseMonth||'')&&Number.isSafeInteger(value.noticeId)&&value.noticeId>0&&typeof value.noticeTitle==='string'&&/\bnew rangers? are here!?(?=\W|$)/i.test(value.noticeTitle)&&value.noticeUrl==='https://notice2.line.me/LGRGS/ios/document/notice'&&typeof value.matchedName==='string'&&value.matchedName.trim().length>0&&[...value.matchedName].length<=240&&Number.isSafeInteger(value.grade)&&value.grade>0&&value.grade<=20&&value.source==='notice2.line.me/LGRGS/ios/document/notice'&&typeof value.publishedAt==='string'&&Number.isFinite(Date.parse(value.publishedAt));
}

export const probeImage=probeCharacterImage;

export async function updateCommunityCharacters({snapshot,history,registry,state,discoveryLog,legacyKnown,probe=probeImage,verifyMetadata,listCatalogIds,findReleaseEvidence}={}){
 const verify=verifyMetadata??createOfficialCharacterVerifier();
 const findReleases=findReleaseEvidence??verify.findOfficialReleaseEvidence;
 const listOfficial=listCatalogIds??verify.listCatalogUnitIds;
 const currentSnapshot=snapshot??await readJson(SNAPSHOT,null);const oldHistory=history??await readJson(HISTORY,{snapshots:[]});const currentRegistry=normalizeRegistry(registry??await readJson(REGISTRY,null));const legacy=knownLegacyIds(legacyKnown??await readJson(LEGACY_KNOWN,{ids:[]}));const currentState=normalizeDiscoveryState(state??await readJson(STATE,null));const currentDiscoveryLog=normalizeCommunityDiscoveryLog(discoveryLog??await readJson(DISCOVERY_LOG,null));
 const existingLedgerErrors=auditCommunityDiscoveryLog(currentRegistry,currentDiscoveryLog);if(existingLedgerErrors.length)throw new Error('community discovery ledger validation failed: '+existingLedgerErrors[0]);
 const rows=currentRows(currentSnapshot);const updatedAt=String(currentSnapshot.updated_at||'');if(!Number.isFinite(Date.parse(updatedAt)))throw new Error('invalid snapshot timestamp');const releaseMonth=monthJST(updatedAt);
 const rowMap=new Map(rows.map(row=>[row.unit_code,row]));const registeredIds=new Set(currentRegistry.characters.map(row=>row.id));
 const nextState={schemaVersion:1,initialized:currentState.initialized===true,initializedAt:currentState.initializedAt||null,lastSnapshotAt:updatedAt,catalogInitialized:currentState.catalogInitialized===true,knownCatalogIds:Array.isArray(currentState.knownCatalogIds)?[...new Set(currentState.knownCatalogIds.filter(id=>typeof id==='string'&&SAFE_ID.test(id)))]:[],catalogStatus:'not_configured',releaseNoticeStatus:'not_configured',knownIds:Array.isArray(currentState.knownIds)?[...new Set(currentState.knownIds.filter(x=>typeof x==='string'))]:[],candidates:currentState.candidates&&typeof currentState.candidates==='object'&&!Array.isArray(currentState.candidates)?structuredClone(currentState.candidates):{}};
 const nextDiscoveryLog={schemaVersion:1,events:[...currentDiscoveryLog.events]};
 let officialIds=null;
 if(typeof listOfficial==='function'){
  try{
   const listed=await listOfficial();
   if(!Array.isArray(listed))throw new Error('invalid_catalog_ids');
   officialIds=new Set(listed.filter(id=>typeof id==='string'&&SAFE_ID.test(id)));
   nextState.catalogStatus='verified';
  }catch{
   nextState.catalogStatus='unavailable';
  }
 }
 const previousCatalog=new Set(nextState.knownCatalogIds);
 const newlyCataloged=nextState.catalogInitialized&&officialIds?new Set([...officialIds].filter(id=>!previousCatalog.has(id))):new Set();
 if(officialIds){
  for(const id of officialIds)previousCatalog.add(id);
  nextState.knownCatalogIds=[...previousCatalog].sort();
  nextState.catalogInitialized=true;
 }
 let releaseNotices={};
 if(typeof findReleases==='function'){
  try{
   const found=releaseMonth>='2026-10'?await findReleases(Date.parse(updatedAt)):{};if(!found||typeof found!=='object'||Array.isArray(found))throw new Error('invalid_release_evidence');
   releaseNotices=Object.fromEntries(Object.entries(found).filter(([id,value])=>SAFE_ID.test(id)&&validReleaseEvidence(value,id)));
   nextState.releaseNoticeStatus='verified';
  }catch{nextState.releaseNoticeStatus='unavailable';}
 }
 const known=new Set(nextState.knownIds);for(const id of registeredIds)known.add(id);for(const id of legacy)known.add(id);
 // If the historical catalog expands later, immediately discard stale
 // candidates for those IDs instead of allowing a previous streak to promote.
 for(const id of known)delete nextState.candidates[id];
 if(!nextState.initialized){for(const id of historyIds(oldHistory))known.add(id);for(const row of rows)known.add(row.unit_code);nextState.initialized=true;nextState.initializedAt=updatedAt;nextState.knownIds=[...known].sort();return {registry:currentRegistry,state:nextState,discoveryLog:nextDiscoveryLog,promoted:[],initialized:true};}
 const previousSnapshotAt=typeof currentState.lastSnapshotAt==='string'&&Number.isFinite(Date.parse(currentState.lastSnapshotAt))?currentState.lastSnapshotAt:null;
 if(previousSnapshotAt&&Date.parse(updatedAt)<Date.parse(previousSnapshotAt))throw new Error('refusing out-of-order community snapshot');
 const promoted=[];
 const candidateIds=new Set([...rowMap.keys(),...newlyCataloged,...Object.keys(nextState.candidates),...Object.keys(releaseNotices)]);
 for(const id of candidateIds){
  if(known.has(id)||registeredIds.has(id))continue;
  const row=rowMap.get(id);
  const prior=nextState.candidates[id]&&typeof nextState.candidates[id]==='object'?nextState.candidates[id]:{};
  let releaseEvidence=releaseNotices[id]||(validReleaseEvidence(prior.releaseEvidence,id)?prior.releaseEvidence:null);
  // An old catalog entry ranking for the first time is not a newly released
  // unit. New catalog IDs can receive a board before they appear in PvP.
  if(officialIds&&currentState.catalogInitialized===true&&!newlyCataloged.has(id)&&!nextState.candidates[id]&&!releaseEvidence)continue;
  const sourcePresent=!!row||!!officialIds?.has(id);
  const image=safeImage(row?.image||('https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png'),id);
  const baseEligible=SAFE_ID.test(id)&&sourcePresent&&!!image;
  const sameSnapshot=prior.lastSeenAt===updatedAt;
  const monthChanged=!!prior.firstSeenMonth&&prior.firstSeenMonth!==releaseMonth;
  const gapMs=prior.lastSeenAt&&Number.isFinite(Date.parse(prior.lastSeenAt))?Date.parse(updatedAt)-Date.parse(prior.lastSeenAt):null;const gapOk=typeof gapMs==='number'&&gapMs>=0&&gapMs<=MAX_GAP_MS;
  let metadata=baseEligible?validateOfficialMetadata(prior.metadata,id):null;
  if(baseEligible&&!metadata){try{metadata=validateOfficialMetadata(await verify(id),id);}catch{metadata=null;}}
  if(releaseEvidence&&(!metadata||releaseEvidence.grade!==metadata.grade||releaseEvidence.matchedName.normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en')!==metadata.nameEn.normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en')))releaseEvidence=null;
  const name=metadata?.name||(row?candidateName(row):null);
  const eligible=baseEligible&&!!metadata&&!!name;
  let imageVerified=eligible&&prior.verifiedImageUrl===image;
  if(eligible&&!imageVerified){try{imageVerified=await probe(image);}catch{imageVerified=false;}}
  let consecutive=Number.isSafeInteger(prior.consecutive)?prior.consecutive:0;
  const evidenceChanged=!!releaseEvidence&&releaseEvidence.noticeId!==prior.releaseEvidence?.noticeId;
  const releaseEvidenceCurrent=releaseEvidence?.releaseMonth===releaseMonth&&Date.parse(updatedAt)>=Date.parse(releaseEvidence.publishedAt);
  if(eligible&&imageVerified&&releaseEvidenceCurrent&&!sameSnapshot){
   const followsPrevious=!monthChanged&&!evidenceChanged&&previousSnapshotAt&&prior.lastSeenAt===previousSnapshotAt&&gapOk;
   consecutive=followsPrevious?consecutive+1:1;
  }else if(!eligible||!imageVerified||!releaseEvidenceCurrent)consecutive=0;
  const firstSeenAt=monthChanged?updatedAt:prior.firstSeenAt||updatedAt;
  const firstSeenMonth=monthChanged?releaseMonth:prior.firstSeenMonth||releaseMonth;
  const record={id,name,image,metadata,metadataVerified:!!metadata,verifiedImageUrl:imageVerified?image:null,firstSeenAt,firstSeenMonth,lastSeenAt:updatedAt,consecutive,eligible,imageVerified,releaseEvidence,discoveredFrom:newlyCataloged.has(id)||prior.discoveredFrom==='catalog'?'catalog':releaseEvidence?'official-announcement':'pvp',pvpRank:row?snapshotRank(row):null,adoptionRate:row?adoptionRate(row):null};
  nextState.candidates[id]=record;
  if(releaseMonth>='2026-10'&&eligible&&imageVerified&&releaseEvidence?.releaseMonth===releaseMonth&&consecutive>=REQUIRED_CONSECUTIVE){
   const topic={id,name:metadata.name,nameEn:metadata.nameEn,nameZh:metadata.nameZh,...(metadata.nameTh?{nameTh:metadata.nameTh}:{}),image,releaseMonth:releaseEvidence.releaseMonth,releaseEvidence,confirmed:true,source:'pvp-auto',metadataSource:metadata.source,unitNameCode:metadata.unitNameCode,evolutionStage:metadata.stage,verifiedGrade:metadata.grade,skillsVerified:true,skillCount:metadata.skillCount,skillsVerifiedAt:metadata.verifiedAt,discoveredFrom:record.discoveredFrom,observationCount:consecutive,firstObservedAt:firstSeenAt,confirmedAt:updatedAt,pvpRank:row?snapshotRank(row):null,adoptionRate:row?adoptionRate(row):null};
   currentRegistry.characters.push(topic);registeredIds.add(id);known.add(id);promoted.push(topic);nextDiscoveryLog.events.push(promotionLogEvent(topic));delete nextState.candidates[id];
  }
 }
 // Refresh ordering metadata only for the active month. Missing PvP data becomes
 // null so a confirmed character naturally moves behind characters with data.
 for(const topic of currentRegistry.characters){if(topic.releaseMonth!==releaseMonth)continue;const row=rowMap.get(topic.id);topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}
 const topicOrder=(a,b)=>((b.adoptionRate??-1)-(a.adoptionRate??-1))||((a.pvpRank??Number.MAX_SAFE_INTEGER)-(b.pvpRank??Number.MAX_SAFE_INTEGER))||a.id.localeCompare(b.id);
 currentRegistry.characters.sort((a,b)=>a.releaseMonth.localeCompare(b.releaseMonth)||topicOrder(a,b));
 promoted.sort(topicOrder);
 nextState.knownIds=[...known].sort();const ledgerErrors=auditCommunityDiscoveryLog(currentRegistry,nextDiscoveryLog);if(ledgerErrors.length)throw new Error('community discovery ledger validation failed: '+ledgerErrors[0]);return {registry:currentRegistry,state:nextState,discoveryLog:nextDiscoveryLog,promoted,initialized:false};
}

async function main(){const result=await updateCommunityCharacters();await atomicJson(REGISTRY,result.registry);await atomicJson(STATE,result.state);await atomicJson(DISCOVERY_LOG,result.discoveryLog);if(result.initialized)console.log('Initialized community character baseline; no automatic topics promoted on the first run.');else if(result.promoted.length)console.log(`Confirmed ${result.promoted.length} new community topic(s): ${result.promoted.map(x=>x.id).join(', ')}`);else console.log('Community character discovery checked; no newly confirmed topics.');}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});}
