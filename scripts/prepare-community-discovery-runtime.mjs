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

export function patchCommunityDiscoverySource(input){
 let source=String(input);
 source=replaceOnce(source,
  "function currentRows(snapshot){if(!snapshot||snapshot.complete_target!==true||snapshot.target_players!==TARGET||snapshot.sampled_players!==TARGET||!Array.isArray(snapshot.characters))throw new Error('refusing incomplete PvP snapshot');const rows=snapshot.characters;if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)))throw new Error('invalid character row in full PvP snapshot');if(new Set(rows.map(row=>row.unit_code)).size!==rows.length)throw new Error('duplicate character ID in full PvP snapshot');return rows;}",
  "function currentRows(snapshot){if(!snapshot||snapshot.target_players!==TARGET||!Number.isSafeInteger(snapshot.sampled_players)||snapshot.sampled_players<1||snapshot.sampled_players>TARGET||!Array.isArray(snapshot.characters))throw new Error('refusing unusable PvP snapshot');const pvpComplete=snapshot.sampled_players===TARGET;if(snapshot.complete_target!==pvpComplete)throw new Error('invalid PvP completeness metadata');const rows=snapshot.characters;if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof row.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)))throw new Error('invalid character row in PvP snapshot');if(new Set(rows.map(row=>row.unit_code)).size!==rows.length)throw new Error('duplicate character ID in PvP snapshot');return {rows,pvpComplete};}",
  'partial PvP acceptance');
 source=replaceOnce(source,
  " const rows=currentRows(currentSnapshot);const updatedAt=String(currentSnapshot.updated_at||'');if(!Number.isFinite(Date.parse(updatedAt)))throw new Error('invalid snapshot timestamp');const releaseMonth=monthJST(updatedAt);",
  " const {rows,pvpComplete}=currentRows(currentSnapshot);const updatedAt=String(currentSnapshot.updated_at||'');if(!Number.isFinite(Date.parse(updatedAt)))throw new Error('invalid snapshot timestamp');const releaseMonth=monthJST(updatedAt);",
  'PvP completeness capture');
 source=replaceOnce(source,
  "   const found=releaseMonth>='2026-10'?await findReleases(Date.parse(updatedAt)):{};if(!found||typeof found!=='object'||Array.isArray(found))throw new Error('invalid_release_evidence');",
  "   const found=await findReleases(Date.parse(updatedAt));if(!found||typeof found!=='object'||Array.isArray(found))throw new Error('invalid_release_evidence');",
  'month-end official notice scan');
 source=replaceOnce(source,
  "  const sourcePresent=!!row||!!officialIds?.has(id);",
  "  const sourcePresent=!!officialIds?.has(id);",
  'official-catalog source requirement');
 source=replaceOnce(source,
  "  const sameSnapshot=prior.lastSeenAt===updatedAt;\n  const monthChanged=!!prior.firstSeenMonth&&prior.firstSeenMonth!==releaseMonth;",
  "  const sameSnapshot=prior.lastSeenAt===updatedAt;\n  const candidateMonth=releaseEvidence?.releaseMonth||prior.firstSeenMonth||releaseMonth;\n  const monthChanged=false;",
  'release-month candidate clock');
 source=replaceOnce(source,
  "  let consecutive=Number.isSafeInteger(prior.consecutive)?prior.consecutive:0;\n  const evidenceChanged=!!releaseEvidence&&releaseEvidence.noticeId!==prior.releaseEvidence?.noticeId;\n  const releaseEvidenceCurrent=releaseEvidence?.releaseMonth===releaseMonth&&Date.parse(updatedAt)>=Date.parse(releaseEvidence.publishedAt);\n  if(eligible&&imageVerified&&releaseEvidenceCurrent&&!sameSnapshot){\n   const followsPrevious=!monthChanged&&!evidenceChanged&&previousSnapshotAt&&prior.lastSeenAt===previousSnapshotAt&&gapOk;\n   consecutive=followsPrevious?consecutive+1:1;\n  }else if(!eligible||!imageVerified||!releaseEvidenceCurrent)consecutive=0;",
  "  let consecutive=Number.isSafeInteger(prior.consecutive)?prior.consecutive:0;\n  const releaseEvidenceCurrent=!!releaseEvidence&&Date.parse(updatedAt)>=Date.parse(releaseEvidence.publishedAt);\n  const officialObservation=eligible&&imageVerified&&!!officialIds?.has(id);\n  if(officialObservation&&!sameSnapshot){\n   const followsPrevious=previousSnapshotAt&&prior.lastSeenAt===previousSnapshotAt&&gapOk;\n   consecutive=followsPrevious?consecutive+1:1;\n  }else if(!officialObservation)consecutive=0;",
  'pre-observe official catalog candidates');
 source=replaceOnce(source,
  "  const firstSeenAt=monthChanged?updatedAt:prior.firstSeenAt||updatedAt;\n  const firstSeenMonth=monthChanged?releaseMonth:prior.firstSeenMonth||releaseMonth;",
  "  const firstSeenAt=monthChanged?updatedAt:prior.firstSeenAt||updatedAt;\n  const firstSeenMonth=monthChanged?candidateMonth:prior.firstSeenMonth||candidateMonth;",
  'candidate release month persistence');
 source=replaceOnce(source,
  "  if(releaseMonth>='2026-10'&&eligible&&imageVerified&&releaseEvidence?.releaseMonth===releaseMonth&&consecutive>=REQUIRED_CONSECUTIVE){",
  "  if(eligible&&imageVerified&&releaseEvidenceCurrent&&consecutive>=REQUIRED_CONSECUTIVE){",
  'notice-triggered promotion after pre-observation');
 source=replaceOnce(source,
  " for(const topic of currentRegistry.characters){if(topic.releaseMonth!==releaseMonth)continue;const row=rowMap.get(topic.id);topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}",
  " for(const topic of currentRegistry.characters){if(topic.releaseMonth!==releaseMonth)continue;const row=rowMap.get(topic.id);if(pvpComplete||row){topic.pvpRank=row?snapshotRank(row):null;topic.adoptionRate=row?adoptionRate(row):null;}}",
  'partial PvP ordering preservation');
 return source;
}

async function main(){
 const original=await readFile(SOURCE,'utf8');
 const patched=patchCommunityDiscoverySource(original);
 if(patched===original)throw new Error('community discovery runtime patch made no changes');
 await writeFile(SOURCE,patched,'utf8');
 console.log('Applied official-source community discovery runtime policy.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
