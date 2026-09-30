import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const SOURCE=resolve('scripts/update-community-characters.mjs');

function replaceOnce(source,needle,replacement,label){
 const first=source.indexOf(needle);
 if(first<0)throw new Error(`community discovery patch target missing: ${label}`);
 if(source.indexOf(needle,first+needle.length)>=0)throw new Error(`community discovery patch target duplicated: ${label}`);
 return source.slice(0,first)+replacement+source.slice(first+needle.length);
}

function assertPatchedPolicy(source){
 const required=[
  ["return {rows,pvpComplete};",'partial PvP completeness capture'],
  ["const found=await findReleases(Date.parse(updatedAt));",'official notice scan'],
  ["const BOARD_GRADE=9;",'Star 9 board grade'],
  ["const MAX_GRADE_TOPICS_PER_MONTH=2;",'top-two monthly cap'],
  ["metadata.grade===BOARD_GRADE",'Star 9 eligibility gate'],
  ["const sourcePresent=!!officialIds?.has(id);",'official catalog source gate'],
  ["const officialObservation=eligible&&imageVerified&&!!officialIds?.has(id)&&(!releaseEvidence||releaseEvidenceCurrent);",'official catalog observation gate'],
  ["const releasePath=releaseEvidenceCurrent&&catalogBacked;",'official notice plus catalog promotion gate'],
  ["gradeTopics<MAX_GRADE_TOPICS_PER_MONTH",'top-two promotion gate'],
  ["if(pvpComplete||row){topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}",'partial ordering preservation']
 ];
 for(const [needle,label] of required){
  if(!source.includes(needle))throw new Error(`community discovery patched policy invariant missing: ${label}`);
 }
}

export function patchCommunityDiscoverySource(input){
 let source=String(input);
 source=replaceOnce(source,
  "function currentRows(snapshot){if(!snapshot||snapshot.complete_target!==true||snapshot.target_players!==TARGET||snapshot.sampled_players!==TARGET||!Array.isArray(snapshot.characters))throw new Error('refusing incomplete PvP snapshot');const rows=snapshot.characters;if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)))throw new Error('invalid character row in full PvP snapshot');if(new Set(rows.map(row=>row.unit_code)).size!==rows.length)throw new Error('duplicate character ID in full PvP snapshot');return rows;}",
  "function currentRows(snapshot){if(!snapshot||snapshot.target_players!==TARGET||!Number.isSafeInteger(snapshot.sampled_players)||snapshot.sampled_players<1||snapshot.sampled_players>TARGET||!Array.isArray(snapshot.characters))throw new Error('refusing unusable PvP snapshot');const pvpComplete=snapshot.sampled_players===TARGET;if(snapshot.complete_target!==pvpComplete)throw new Error('invalid PvP completeness metadata');const rows=snapshot.characters;if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)))throw new Error('invalid character row in PvP snapshot');if(new Set(rows.map(row=>row.unit_code)).size!==rows.length)throw new Error('duplicate character ID in PvP snapshot');return {rows,pvpComplete};}",
  'partial PvP acceptance');
 source=replaceOnce(source,
  " const rows=currentRows(currentSnapshot);const updatedAt=String(currentSnapshot.updated_at||'');if(!Number.isFinite(Date.parse(updatedAt)))throw new Error('invalid snapshot timestamp');const releaseMonth=communityReleaseMonthJST(updatedAt);",
  " const {rows,pvpComplete}=currentRows(currentSnapshot);const updatedAt=String(currentSnapshot.updated_at||'');if(!Number.isFinite(Date.parse(updatedAt)))throw new Error('invalid snapshot timestamp');const releaseMonth=communityReleaseMonthJST(updatedAt);",
  'PvP completeness capture');
 source=replaceOnce(source,
  "  const sourcePresent=!!row||!!officialIds?.has(id);",
  "  const sourcePresent=!!officialIds?.has(id);",
  'official catalog source requirement');
 source=replaceOnce(source,
  "  const officialObservation=eligible&&imageVerified&&(officialIds?officialIds.has(id):!!row)&&(!releaseEvidence||releaseEvidenceCurrent);",
  "  const officialObservation=eligible&&imageVerified&&!!officialIds?.has(id)&&(!releaseEvidence||releaseEvidenceCurrent);",
  'official catalog observation requirement');
 source=replaceOnce(source,
  "  const releasePath=releaseEvidence?releaseEvidenceCurrent:catalogBacked;",
  "  const releasePath=releaseEvidenceCurrent&&catalogBacked;",
  'official notice plus catalog promotion requirement');
 source=replaceOnce(source,
  " for(const topic of currentRegistry.characters){if(topic.releaseMonth!==releaseMonth)continue;const row=rowMap.get(topic.id);topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}",
  " for(const topic of currentRegistry.characters){if(topic.releaseMonth!==releaseMonth)continue;const row=rowMap.get(topic.id);if(pvpComplete||row){topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}}",
  'partial PvP ordering preservation');
 assertPatchedPolicy(source);
 return source;
}

async function main(){
 const original=await readFile(SOURCE,'utf8');
 const patched=patchCommunityDiscoverySource(original);
 if(patched===original)throw new Error('community discovery runtime patch made no changes');
 await writeFile(SOURCE,patched,'utf8');
 console.log('Applied official-source Star 9 community discovery runtime policy.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
