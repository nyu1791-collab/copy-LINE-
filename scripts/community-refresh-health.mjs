import {appendFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {auditCommunityDiscoveryLog,normalizeCommunityDiscoveryLog} from './community-discovery-log.mjs';
import {normalizeDiscoveryState,normalizeRegistry} from './update-community-characters.mjs';

const SNAPSHOT_PATH=resolve('public/pvp/data/character_usage.json');
const STATE_PATH=resolve('data/community-character-discovery.json');
const REGISTRY_PATH=resolve('config/community-characters.json');
const LOG_PATH=resolve('data/community-character-discovery-log.json');
const SAFE_RANKED_ID=/^[A-Za-z0-9_-]{1,80}$/;
const SAFE_NEW_ID=/^u\d+e-[a-z0-9_-]+$/i;
const TARGET=200;
const FUTURE_TOLERANCE_MS=5*60*1000;

function status(action,reason,ageMinutes=null,snapshotStatus='unknown'){
 return {action,reason,ageMinutes,snapshotStatus};
}

function validateCompleteSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return 'snapshot_not_an_object';
 if(snapshot.target_players!==TARGET||snapshot.sampled_players!==TARGET||snapshot.complete_target!==true)return 'snapshot_not_200_of_200';
 if(!Array.isArray(snapshot.characters))return 'snapshot_characters_missing';
 const seen=new Set();let slots=0;
 for(const row of snapshot.characters){
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!SAFE_RANKED_ID.test(row.unit_code)||seen.has(row.unit_code))return 'snapshot_character_rows_invalid';
  seen.add(row.unit_code);
  if(!Number.isSafeInteger(row.occurrence_count)||row.occurrence_count<1||!Number.isSafeInteger(row.player_count)||row.player_count<1||row.player_count>TARGET||row.player_count>row.occurrence_count||!Number.isSafeInteger(row.rank)||row.rank<1)return 'snapshot_counts_invalid';
  slots+=row.occurrence_count;
 }
 if(snapshot.unique_characters!==snapshot.characters.length||snapshot.character_slots!==slots)return 'snapshot_totals_invalid';
 return null;
}

export function assessCommunityRefreshHealth({snapshot,state,registry,discoveryLog,now=Date.now(),maxAgeMinutes=45}={}){
 if(!Number.isFinite(now)||!Number.isFinite(maxAgeMinutes)||maxAgeMinutes<1)return status('investigate','invalid_watchdog_configuration');
 if(snapshot==null)return status('collection','snapshot_missing',null,'missing');
 const snapshotProblem=validateCompleteSnapshot(snapshot);
 if(snapshotProblem==='snapshot_not_200_of_200')return status('collection',snapshotProblem,null,'incomplete');
 if(snapshotProblem)return status('investigate',snapshotProblem,null,'invalid');
 const snapshotMs=Date.parse(snapshot.updated_at);
 if(!Number.isFinite(snapshotMs))return status('investigate','snapshot_timestamp_invalid',null,'invalid');
 const ageMs=now-snapshotMs;
 if(ageMs < -FUTURE_TOLERANCE_MS)return status('investigate','snapshot_timestamp_in_future',ageMs/60000,'invalid');
 const ageMinutes=Math.max(0,ageMs/60000);
 if(ageMinutes>maxAgeMinutes)return status('collection','snapshot_stale',ageMinutes,'stale');

 let normalizedState,normalizedRegistry,normalizedLog;
 try{
  normalizedState=normalizeDiscoveryState(state);
  normalizedRegistry=normalizeRegistry(registry);
  normalizedLog=normalizeCommunityDiscoveryLog(discoveryLog);
 }catch{
  return status('investigate','persisted_discovery_data_invalid',ageMinutes,'fresh_complete');
 }
 const ledgerErrors=auditCommunityDiscoveryLog(normalizedRegistry,normalizedLog);
 if(ledgerErrors.length)return status('investigate','promotion_log_registry_mismatch',ageMinutes,'fresh_complete');
 const lastAt=normalizedState.lastSnapshotAt;
 if(typeof lastAt!=='string'||!Number.isFinite(Date.parse(lastAt))||lastAt!==snapshot.updated_at)return status('discovery','discovery_snapshot_out_of_sync',ageMinutes,'fresh_complete');
 if(normalizedState.initialized!==true||normalizedState.catalogInitialized!==true||!Array.isArray(normalizedState.knownCatalogIds)||normalizedState.knownCatalogIds.length===0||normalizedState.catalogStatus!=='verified'||normalizedState.releaseNoticeStatus!=='verified')return status('discovery','official_discovery_verification_incomplete',ageMinutes,'fresh_complete');
 for(const [id,candidate] of Object.entries(normalizedState.candidates)){
  if(!SAFE_NEW_ID.test(id)||!candidate||typeof candidate!=='object'||Array.isArray(candidate)||candidate.id!==id||typeof candidate.lastSeenAt!=='string'||!Number.isFinite(Date.parse(candidate.lastSeenAt))||!Number.isSafeInteger(candidate.consecutive)||candidate.consecutive<0)return status('investigate','candidate_state_invalid',ageMinutes,'fresh_complete');
  if(candidate.lastSeenAt!==snapshot.updated_at)return status('discovery','candidate_state_out_of_sync',ageMinutes,'fresh_complete');
 }
 return status('healthy','snapshot_and_discovery_current',ageMinutes,'fresh_complete');
}

async function readJson(path,{optional=false}={}){
 try{return JSON.parse(await readFile(path,'utf8'));}
 catch(error){if(optional&&error&&typeof error==='object'&&error.code==='ENOENT')return null;throw error;}
}

function argumentValue(name,fallback){
 const index=process.argv.indexOf(name);
 return index<0?fallback:process.argv[index+1];
}

async function main(){
 const maxAgeMinutes=Number(argumentValue('--max-age-minutes','45'));
 const requiredFreshComplete=process.argv.includes('--require-fresh-complete');
 const [snapshot,state,registry,discoveryLog]=await Promise.all([
  readJson(SNAPSHOT_PATH,{optional:true}),
  readJson(STATE_PATH),
  readJson(REGISTRY_PATH),
  readJson(LOG_PATH),
 ]);
 const result=assessCommunityRefreshHealth({snapshot,state,registry,discoveryLog,maxAgeMinutes});
 console.log(`Community recovery action: ${result.action} (${result.reason}); sample age: ${result.ageMinutes===null?'unknown':Math.round(result.ageMinutes)+'m'}.`);
 if(process.env.GITHUB_OUTPUT){
  await appendFile(process.env.GITHUB_OUTPUT,`action=${result.action}\nreason=${result.reason}\nsnapshot_status=${result.snapshotStatus}\nage_minutes=${result.ageMinutes===null?'unknown':Math.max(0,Math.round(result.ageMinutes))}\n`);
 }
 if(result.action==='investigate'){
  console.error('::error::Persisted community or PvP data failed the read-only recovery checks; automatic writes were stopped.');
  process.exitCode=1;
 }
 if(requiredFreshComplete&&result.snapshotStatus!=='fresh_complete'){
  console.error('::error::Discovery-only recovery requires a recent, complete 200/200 snapshot.');
  process.exitCode=1;
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
