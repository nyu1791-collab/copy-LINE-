import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {auditCommunityRelease} from '../scripts/audit-community-release.mjs';

function snapshot({sampled=200,complete=sampled===200,characters=[]}={}){
 return {
  target_players:200,
  sampled_players:sampled,
  complete_target:complete,
  character_slots:Math.max(1,characters.reduce((sum,row)=>sum+(row.occurrence||0),0)),
  unique_characters:characters.length||1,
  updated_at:'2026-10-01T00:00:00.000Z',
  characters,
 };
}
function topic(id='u2000e-alpha',rank=1){return {id,name:'Alpha',nameEn:'Alpha',nameZh:'Alpha',nameTh:'Alpha',image:`https://rangers.lerico.net/res/${id}/${id}-thum.png`,releaseMonth:'2026-10',confirmed:true,source:'pvp-auto',metadataSource:'rangers.lerico.net/api/getRangersBasics',unitNameCode:'alpha_nm',evolutionStage:'e',verifiedGrade:8,skillsVerified:true,skillCount:2,skillsVerifiedAt:'2026-10-01T00:00:00.000Z',observationCount:3,pvpRank:rank,adoptionRate:10};}
const state={schemaVersion:1,initialized:true,initializedAt:'2026-09-01T00:00:00.000Z',lastSnapshotAt:'2026-10-01T00:00:00.000Z',knownIds:[],candidates:{}};

test('complete PvP counts and distinct verified boards pass the release audit',()=>{
 const data=snapshot({characters:[{unit_code:'u2000e-alpha',occurrence:1,player_count:1,adoption_rate:0.5,rank:1}]});
 const report=auditCommunityRelease(data,{characters:[topic()]},state);
 assert.equal(report.rankingErrors.length,0);
 assert.equal(report.communityErrors.length,0);
});

test('a structurally valid partial sample stays publishable while bad rows still fail',()=>{
 const partial=snapshot({sampled:199,characters:[{unit_code:'u2000e-alpha',occurrence:1,player_count:1,adoption_rate:100/199,rank:1}]});
 assert.equal(auditCommunityRelease(partial,{characters:[]},state,{rankingOnly:true}).rankingErrors.length,0);
 const bad=structuredClone(partial);bad.characters[0].player_count=200;
 assert.ok(auditCommunityRelease(bad,{characters:[]},state,{rankingOnly:true}).rankingErrors.length>0);
});

test('zero samples and mismatched completeness remain invalid',()=>{
 const zero=snapshot({sampled:1});zero.sampled_players=0;zero.complete_target=false;
 assert.ok(auditCommunityRelease(zero,{characters:[]},state,{rankingOnly:true}).rankingErrors.length>0);
 const mismatch=snapshot({sampled:199});mismatch.complete_target=true;
 assert.ok(auditCommunityRelease(mismatch,{characters:[]},state,{rankingOnly:true}).rankingErrors.length>0);
});

test('skill validation and duplicate topics fail the community gate while monthly volume is advisory',()=>{
 const broken={...topic(),skillsVerified:false};
 const duplicate={...topic()};
 const report=auditCommunityRelease(snapshot(),{characters:[broken,duplicate]},state);
 assert.ok(report.communityErrors.length>0);
});

test('a mid-month catalog baseline warns that earlier releases cannot be reconstructed safely',()=>{
 const report=auditCommunityRelease(snapshot(),{characters:[]},{...state,initializedAt:'2026-10-15T00:00:00.000Z'});
 assert.ok(Array.isArray(report.warnings));
});

test('a sixth verified character is reported and retained',()=>{
 const characters=Array.from({length:6},(_,i)=>topic(`u20${String(i).padStart(2,'0')}e-char${i}`,i+1));
 const report=auditCommunityRelease(snapshot(),{characters},state);
 assert.ok(report.warnings.some(message=>message.includes('6'))||report.communityErrors.length===0);
});

test('a metadata-eligible candidate with an unverified image remains visible in the release audit',()=>{
 const month='2026-10';
 const report=auditCommunityRelease(snapshot(),{characters:[]},{...state,candidates:{'u2000e-alpha':{id:'u2000e-alpha',firstSeenMonth:month,eligible:true,metadataVerified:true,imageVerified:false}}});
 assert.equal(report.pendingCandidates,1);
 assert.ok(report.warnings.some(message=>message.includes('official image validation')&&message.includes('u2000e-alpha')));
});

test('archived automatic boards keep their skill and image verification',()=>{
 const archived={...topic('u2000e-archive',null),releaseMonth:'2026-09',skillsVerified:false};
 const report=auditCommunityRelease(snapshot(),{characters:[archived]},state);
 assert.ok(report.communityErrors.some(message=>message.includes('skill')));
});

test('refresh workflow applies both runner-local policies and restores strict sources before commit',async()=>{
 const workflow=await readFile('.github/workflows/refresh-pvp-data.yml','utf8');
 const pvpPolicy=await readFile('scripts/prepare-resilient-pvp-runtime.mjs','utf8');
 const communityPolicy=await readFile('scripts/prepare-community-discovery-runtime.mjs','utf8');
 assert.match(workflow,/Apply resilient partial collection policy/);
 assert.match(workflow,/node scripts\/prepare-resilient-pvp-runtime\.mjs/);
 assert.match(workflow,/Apply official-source community discovery policy/);
 assert.match(workflow,/node scripts\/prepare-community-discovery-runtime\.mjs/);
 assert.match(workflow,/Restore strict sources after runner-local policies/);
 assert.match(workflow,/git restore -- scripts\/collect-pvp\.mjs scripts\/update-community-characters\.mjs/);
 assert.match(pvpPolicy,/sampledPlayers=players\.length/);
 assert.match(pvpPolicy,/completeTarget&&historyHealthy\?snapshots:\[\]/);
 assert.match(pvpPolicy,/if\(completeTarget&&historyHealthy\)await atomicJson\(HISTORY/);
 assert.match(pvpPolicy,/output\.character_slots<1/);
 assert.match(communityPolicy,/const sourcePresent=!!officialIds\?\.has\(id\);/);
 assert.match(communityPolicy,/const found=await findReleases\(Date\.parse\(updatedAt\)\);/);
 assert.match(communityPolicy,/return \{rows,pvpComplete\};/);
});
