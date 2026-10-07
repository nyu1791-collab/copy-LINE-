import assert from 'node:assert/strict';
import test from 'node:test';
import {monthlyBoardLimit,byAdditionOrder} from '../lib/community-release-policy.mjs';
import {updateCommunityCharacters} from '../scripts/update-community-characters.mjs';

const ids=['u2000e-alpha','u2001e-beta','u2002e-gamma'];
function metadata(id){return {id,name:id+'日本語',nameEn:id+' English',nameZh:id+' 中文',nameTh:id+' ไทย',unitNameCode:id+'_nm',stage:'e',grade:9,skillsVerified:true,skillCount:2,verifiedAt:'2026-10-01T00:00:00Z'};}
function evidence(id,month){return {catalogId:id,releaseMonth:month,noticeId:123,noticeTitle:'New Rangers are here!',noticeUrl:'https://notice2.line.me/LGRGS/ios/document/notice',source:'notice2.line.me/LGRGS/ios/document/notice',matchedName:metadata(id).nameEn,grade:9,publishedAt:month+'-01T00:00:00+09:00'};}
async function discover(month,{probe=async()=>true,sampled=199,listCatalogIds=async()=>ids,steps=3}={}){
 let registry={schemaVersion:1,characters:[]};
 let state={schemaVersion:1,initialized:true,initializedAt:'2026-09-01T00:00:00Z',knownIds:[],candidates:{}};
 let result;
 for(let hour=0;hour<steps;hour++){
  result=await updateCommunityCharacters({snapshot:{updated_at:month+'-01T'+String(hour).padStart(2,'0')+':00:00+09:00',sampled_players:sampled,target_players:200,complete_target:sampled===200,
    characters:ids.map((id,index)=>({unit_code:id,name:id,rank:index+1,adoption_rate:99-index*40}))},
    history:{snapshots:[]},legacyKnown:{ids:[]},registry,state,verifyMetadata:metadata,probe,listCatalogIds,
    findReleaseEvidence:async()=>Object.fromEntries(ids.map(id=>[id,evidence(id,month)]))});
  registry=result.registry;state=result.state;
 }
 return result;
}
test('all even months get two boards and all odd months get one',()=>{
 for(let month=1;month<=12;month++)assert.equal(monthlyBoardLimit('2027-'+String(month).padStart(2,'0')),month%2===0?2:1);
 for(const invalid of ['2026-00','2026-13','2026-1','abc',null])assert.throws(()=>monthlyBoardLimit(invalid));
});
test('selection follows source addition order even when popularity is reversed',async()=>{
 assert.deepEqual([...ids].sort(byAdditionOrder),[ids[2],ids[1],ids[0]]);
 assert.deepEqual((await discover('2026-10')).promoted.map(row=>row.id),[ids[2],ids[1]]);
 assert.deepEqual((await discover('2026-11')).promoted.map(row=>row.id),[ids[2]]);
 assert.deepEqual((await discover('2027-01')).promoted.map(row=>row.id),[ids[2]]);
});
test('a broken selected image cannot promote a lower character into its reserved slot',async()=>{
 const result=await discover('2026-10',{probe:async url=>!url.includes(ids[2])});
 assert.deepEqual(result.promoted.map(row=>row.id),[ids[1]]);
 assert.equal(result.state.candidates[ids[2]].imageVerified,false);
 assert.equal(result.state.candidates[ids[0]].selectionStatus,'outside_monthly_limit');
});
test('catalog failure preserves pending state and prevents unverified publication',async()=>{
 const result=await discover('2026-10',{listCatalogIds:async()=>{throw new Error('network');}});
 assert.deepEqual(result.promoted,[]);
 assert.equal(result.state.catalogStatus,'unavailable');
});
test('partial samples do not add a 200-player dependency to catalog release verification',async()=>{
 for(const sampled of [1,73,199,200])assert.deepEqual((await discover('2026-11',{sampled})).promoted.map(row=>row.id),[ids[2]]);
});
