import assert from 'node:assert/strict';
import test from 'node:test';
import {auditCommunityRelease} from '../scripts/audit-community-release.mjs';

const month='2026-10';
function snapshot(){
 return {updated_at:'2026-10-20T03:00:00.000Z',target_players:200,sampled_players:200,complete_target:true,character_slots:5,unique_characters:2,characters:[
  {unit_code:'u2000e-alpha',rank:1,occurrence_count:2,player_count:2},
  {unit_code:'u2001e-beta',rank:2,occurrence_count:3,player_count:2},
 ]};
}
function topic(id,rank){
 return {id,releaseMonth:month,name:'キャラ',nameEn:'New character',nameZh:'新角',source:'pvp-auto',image:'https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png',pvpRank:rank,verifiedGrade:8,releaseEvidence:{releaseMonth:month,noticeId:100028330,noticeTitle:'New Rangers are here!',noticeUrl:'https://notice2.line.me/LGRGS/ios/document/notice#100028330',publishedAt:'2026-10-01T00:00:00.000Z',catalogId:id,matchedName:'New character',grade:8,source:'notice2.line.me/LGRGS/ios/document/notice'},skillsVerified:true,skillCount:2,skillsVerifiedAt:'2026-10-19T00:00:00.000Z',observationCount:3};
}
const state={catalogInitialized:true,catalogStatus:'verified',candidates:{}};

test('complete PvP counts and distinct verified boards pass the release audit',()=>{
 const report=auditCommunityRelease(snapshot(),{characters:[topic('u2000e-alpha',1),topic('u2001e-beta',2),topic('u2002e-gamma',null)]},state);
 assert.deepEqual(report.rankingErrors,[]);
 assert.deepEqual(report.communityErrors,[]);
 assert.equal(report.currentTopics,3);
 assert.equal(report.rankedTopics,2);
 assert.equal(report.skillVerifiedTopics,3);
});

test('false 200, duplicate ranked IDs and negative occurrences stop the ranking gate',()=>{
 const broken=snapshot();broken.sampled_players=199;broken.characters[1].unit_code=broken.characters[0].unit_code;broken.characters[0].occurrence_count=-1;
 const report=auditCommunityRelease(broken,{characters:[]},state);
 assert.ok(report.rankingErrors.some(message=>message.includes('200/200')));
 assert.ok(report.rankingErrors.some(message=>message.includes('duplicate')));
 assert.ok(report.rankingErrors.some(message=>message.includes('invalid PvP counts')));
});

test('skill validation and duplicate topics fail the community gate while monthly volume is advisory',()=>{
 const first=topic('u2000e-alpha',1);
 const report=auditCommunityRelease(snapshot(),{characters:[{...first,skillsVerified:false},first]},state);
 assert.equal(report.rankingErrors.length,0);
 assert.ok(report.communityErrors.some(message=>message.includes('skill')));
 assert.ok(report.communityErrors.some(message=>message.includes('duplicate')));
 assert.ok(report.warnings.some(message=>message.includes('Fewer than three')));
});

test('a mid-month catalog baseline warns that earlier releases cannot be reconstructed safely',()=>{
 const report=auditCommunityRelease(snapshot(),{characters:[topic('u2000e-alpha',1)]},{...state,initializedAt:'2026-10-16T00:00:00.000Z'});
 assert.ok(report.warnings.some(message=>message.includes('2026-10-16')&&message.includes('prior catalog snapshot')));
});

test('a sixth verified character is reported and retained',()=>{
 const topics=Array.from({length:6},(_,i)=>topic('u200'+i+'e-new',null));
 const report=auditCommunityRelease(snapshot(),{characters:topics},state);
 assert.equal(report.currentTopics,6);
 assert.equal(report.communityErrors.length,0);
 assert.ok(report.warnings.some(message=>message.includes('More than five')));
});

test('a metadata-eligible candidate with an unverified image remains visible in the release audit',()=>{
 const report=auditCommunityRelease(snapshot(),{characters:[]},{...state,candidates:{'u2000e-alpha':{id:'u2000e-alpha',firstSeenMonth:month,eligible:true,metadataVerified:true,imageVerified:false}}});
 assert.equal(report.pendingCandidates,1);
 assert.ok(report.warnings.some(message=>message.includes('official image validation')&&message.includes('u2000e-alpha')));
});

test('archived automatic boards keep their skill and image verification',()=>{
 const archived={...topic('u2000e-archive',null),releaseMonth:'2026-09',skillsVerified:false};
 const report=auditCommunityRelease(snapshot(),{characters:[archived]},state);
 assert.ok(report.communityErrors.some(message=>message.includes('skill')));
});
