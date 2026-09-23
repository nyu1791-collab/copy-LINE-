import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readJson,updateCommunityCharacters} from '../scripts/update-community-characters.mjs';

function snapshot(updatedAt,rows,{complete=true,sampled=200}={}){
 return {
  complete_target:complete,
  target_players:200,
  sampled_players:sampled,
  updated_at:updatedAt,
  characters:rows,
 };
}

const rows=[
 {unit_code:'u2000e-alpha',name:'新キャラ Alpha',image:'https://rangers.lerico.net/res/u2000e-alpha/u2000e-alpha-thum.png',rank:4,adoption_rate:13.0},
 {unit_code:'u2001e-beta',name:'新キャラ Beta',image:'https://rangers.lerico.net/res/u2001e-beta/u2001e-beta-thum.png',rank:11,adoption_rate:35.0},
 {unit_code:'u2002e-gamma',name:'新キャラ Gamma',image:'https://rangers.lerico.net/res/u2002e-gamma/u2002e-gamma-thum.png',rank:null,adoption_rate:null},
];
const noLegacy={ids:[]};
function initialState(){return {schemaVersion:1,initialized:true,initializedAt:'2026-09-30T14:00:00.000Z',lastSnapshotAt:'2026-09-30T14:00:00.000Z',knownIds:['u1000e-old'],candidates:{}};}
function metadataFor(id){
 const row=rows.find(item=>item.unit_code===id);
 if(!row)return null;
 const tail=id.split('-').at(-1);
 return {id,name:row.name,nameEn:'New '+tail,nameZh:'新角 '+tail,nameTh:'ใหม่ '+tail,unitNameCode:'unit_'+tail,stage:'e',grade:8,skillsVerified:true,skillCount:2,source:'rangers.lerico.net/api/getRangersBasics',verifiedAt:'2026-10-01T00:00:00.000Z'};
}
function releaseEvidenceFor(id,releaseMonth='2026-10'){
 return {releaseMonth,noticeId:100028330,noticeTitle:'New Rangers are here!',noticeUrl:'https://notice2.line.me/LGRGS/ios/document/notice',publishedAt:'2026-09-30T15:00:00.000Z',catalogId:id,matchedName:metadataFor(id)?.nameEn||'New character',grade:8,source:'notice2.line.me/LGRGS/ios/document/notice'};
}
const releaseEvidenceForRows=async candidateRows=>Object.fromEntries(candidateRows.map(row=>[row.unit_code,releaseEvidenceFor(row.unit_code)]));

async function threeConfirmedSnapshots({candidateRows=rows,legacyKnown=noLegacy,probe=async()=>true,verifyMetadata=metadataFor,findReleaseEvidence=()=>releaseEvidenceForRows(candidateRows)}={}){
 let registry={schemaVersion:1,characters:[]};
 let state=initialState();
 let result;
 for(const updatedAt of ['2026-10-01T00:00:00+09:00','2026-10-01T01:00:00+09:00','2026-10-01T02:00:00+09:00']){
  result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,candidateRows),history:{snapshots:[]},registry,state,legacyKnown,probe,verifyMetadata,findReleaseEvidence});
  registry=result.registry;state=result.state;
 }
 return result;
}

test('multiple new characters are confirmed together without replacing each other',async()=>{
 const final=await threeConfirmedSnapshots();
 assert.deepEqual(final.promoted.map(topic=>topic.id),['u2001e-beta','u2000e-alpha','u2002e-gamma']);
 assert.deepEqual(final.registry.characters.map(topic=>topic.id),['u2001e-beta','u2000e-alpha','u2002e-gamma']);
 assert.equal(new Set(final.registry.characters.map(topic=>topic.id)).size,3);
 assert.ok(final.registry.characters.every(topic=>topic.releaseMonth==='2026-10'&&topic.confirmed===true&&topic.nameEn&&topic.nameZh&&topic.nameTh));
 assert.ok(final.registry.characters.every(topic=>topic.skillsVerified===true&&topic.skillCount===2));
 assert.equal(final.registry.characters.at(-1).pvpRank,null,'confirmed character without PvP rank stays last');
});

test('historical character IDs cannot be promoted again when they reappear in PvP',async()=>{
 const legacyRow={unit_code:'u1630e-sally',name:'過去キャラ',image:'https://rangers.lerico.net/res/u1630e-sally/u1630e-sally-thum.png',rank:1,adoption_rate:50};
 const final=await threeConfirmedSnapshots({candidateRows:[legacyRow],legacyKnown:{ids:['u1630e-sally']}});
 assert.deepEqual(final.promoted,[]);
 assert.deepEqual(final.registry.characters,[]);
 assert.equal(final.state.candidates['u1630e-sally'],undefined);
 assert.ok(final.state.knownIds.includes('u1630e-sally'));
});

test('automatic topic promotion fails closed on partial PvP samples',async()=>{
 await assert.rejects(()=>updateCommunityCharacters({
  snapshot:snapshot('2026-10-01T00:00:00+09:00',rows,{sampled:199}),
  history:{snapshots:[]},registry:{schemaVersion:1,characters:[]},state:initialState(),legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,
 }),/refusing incomplete PvP snapshot/);
});

test('repeated complete snapshots do not publish a character without current-month official release evidence',async()=>{
 const final=await threeConfirmedSnapshots({candidateRows:[rows[0]],findReleaseEvidence:async()=>({})});
 assert.deepEqual(final.promoted,[]);
 assert.equal(final.registry.characters.length,0);
 assert.equal(final.state.candidates['u2000e-alpha'].consecutive,0);
 assert.equal(final.state.candidates['u2000e-alpha'].releaseEvidence,null);
});

test('metadata that is not present in the official localized unit catalog remains unpublished',async()=>{
 const final=await threeConfirmedSnapshots({candidateRows:[rows[0]],verifyMetadata:async()=>null});
 assert.deepEqual(final.promoted,[]);
 assert.equal(final.state.candidates['u2000e-alpha'].metadataVerified,false);
 assert.equal(final.state.candidates['u2000e-alpha'].consecutive,0);
});

test('a candidate crossing JST month end starts its verified release streak on the official release date',async()=>{
 let registry={schemaVersion:1,characters:[]};
 let state={...initialState(),lastSnapshotAt:'2026-09-30T12:00:00.000Z'};
 let result;
 for(const updatedAt of ['2026-09-30T13:00:00.000Z','2026-09-30T14:00:00.000Z','2026-09-30T15:00:00.000Z']){
  result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,[rows[0]]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,findReleaseEvidence:()=>releaseEvidenceForRows([rows[0]])});
  registry=result.registry;state=result.state;
 }
 assert.deepEqual(result.promoted,[]);
 assert.equal(state.candidates['u2000e-alpha'].firstSeenMonth,'2026-10');
 assert.equal(state.candidates['u2000e-alpha'].consecutive,1);
 for(const updatedAt of ['2026-09-30T16:00:00.000Z','2026-09-30T17:00:00.000Z']){
  result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,[rows[0]]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,findReleaseEvidence:()=>releaseEvidenceForRows([rows[0]])});
  registry=result.registry;state=result.state;
 }
 assert.equal(result.promoted[0].releaseMonth,'2026-10');
});


test('out-of-order snapshots cannot extend a new-character streak',async()=>{
 let registry={schemaVersion:1,characters:[]};let state=initialState();
 const first=await updateCommunityCharacters({snapshot:snapshot('2026-10-01T00:00:00+09:00',[rows[0]]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor});
 const second=await updateCommunityCharacters({snapshot:snapshot('2026-10-01T01:00:00+09:00',[rows[0]]),history:{snapshots:[]},registry:first.registry,state:first.state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor});
 await assert.rejects(()=>updateCommunityCharacters({snapshot:snapshot('2026-10-01T00:30:00+09:00',[rows[0]]),history:{snapshots:[]},registry:second.registry,state:second.state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor}),/out-of-order community snapshot/);
});

test('unverified character images never accumulate a promotion streak',async()=>{
 const final=await threeConfirmedSnapshots({candidateRows:[rows[0]],probe:async()=>false});
 assert.deepEqual(final.promoted,[]);
 assert.equal(final.registry.characters.length,0);
 assert.equal(final.state.candidates['u2000e-alpha'].imageVerified,false);
 assert.equal(final.state.candidates['u2000e-alpha'].consecutive,0);
});

test('three catalog releases get separate monthly topics before any of them ranks in PvP',async()=>{
 let state={...initialState(),catalogInitialized:true,knownCatalogIds:['u1000e-old']};
 let registry={schemaVersion:1,characters:[]};
 const prior={unit_code:'u1000e-old',rank:1,adoption_rate:12};
 let final;
 for(const updatedAt of ['2026-10-01T00:00:00+09:00','2026-10-01T01:00:00+09:00','2026-10-01T02:00:00+09:00']){
  final=await updateCommunityCharacters({snapshot:snapshot(updatedAt,[prior]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,listCatalogIds:async()=>['u1000e-old',...rows.map(row=>row.unit_code)],findReleaseEvidence:()=>releaseEvidenceForRows(rows)});
  state=final.state;registry=final.registry;
 }
 assert.equal(final.promoted.length,3);
 assert.ok(final.promoted.every(topic=>topic.discoveredFrom==='catalog'&&topic.pvpRank===null&&topic.adoptionRate===null&&topic.skillsVerified));
 assert.equal(final.state.candidates['u1000e-old'],undefined);
});

test('an exact current-month release notice can qualify a unit already present in the catalog baseline',async()=>{
 const id=rows[0].unit_code;
 let state={...initialState(),catalogInitialized:true,knownCatalogIds:['u1000e-old',id]};
 let registry={schemaVersion:1,characters:[]};
 let result;
 for(const updatedAt of ['2026-10-01T00:00:00+09:00','2026-10-01T01:00:00+09:00','2026-10-01T02:00:00+09:00']){
  result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,[]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,listCatalogIds:async()=>['u1000e-old',id],findReleaseEvidence:()=>releaseEvidenceForRows([rows[0]])});
  registry=result.registry;state=result.state;
 }
 assert.deepEqual(result.promoted.map(topic=>topic.id),[id]);
 assert.equal(registry.characters[0].pvpRank,null);
});

test('an existing monthly board receives its real PvP rank after the character first ranks',async()=>{
 let state={...initialState(),catalogInitialized:true,knownCatalogIds:['u1000e-old']};
 let registry={schemaVersion:1,characters:[]};
 let result;
 const old={unit_code:'u1000e-old',rank:1,adoption_rate:12};
 for(const updatedAt of ['2026-10-01T00:00:00+09:00','2026-10-01T01:00:00+09:00','2026-10-01T02:00:00+09:00']){
  result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,[old]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,listCatalogIds:async()=>['u1000e-old',rows[0].unit_code],findReleaseEvidence:()=>releaseEvidenceForRows([rows[0]])});
  state=result.state;registry=result.registry;
 }
 assert.equal(registry.characters[0].pvpRank,null);
 const ranked=await updateCommunityCharacters({snapshot:snapshot('2026-10-01T03:00:00+09:00',[old,{...rows[0],rank:7,adoption_rate:18}]),history:{snapshots:[]},registry,state,legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,listCatalogIds:async()=>['u1000e-old',rows[0].unit_code],findReleaseEvidence:()=>releaseEvidenceForRows([rows[0]])});
 assert.equal(ranked.promoted.length,0);
 assert.equal(ranked.registry.characters.length,1);
 assert.equal(ranked.registry.characters[0].pvpRank,7);
 assert.equal(ranked.registry.characters[0].adoptionRate,18);
});

test('a previously cataloged character newly ranked in PvP does not create an old-character board',async()=>{
 const old={...rows[0]};
 const result=await updateCommunityCharacters({snapshot:snapshot('2026-10-01T00:00:00+09:00',[old]),history:{snapshots:[]},registry:{schemaVersion:1,characters:[]},state:{...initialState(),catalogInitialized:true,knownCatalogIds:[old.unit_code]},legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor,listCatalogIds:async()=>[old.unit_code]});
 assert.deepEqual(result.promoted,[]);
 assert.equal(result.state.candidates[old.unit_code],undefined);
});

test('missing official skill descriptions cannot promote a new character board',async()=>{
 const result=await threeConfirmedSnapshots({candidateRows:[rows[0]],verifyMetadata:async id=>({...metadataFor(id),skillsVerified:false,skillCount:0})});
 assert.equal(result.promoted.length,0);
 assert.equal(result.state.candidates[rows[0].unit_code].consecutive,0);
});

test('board API backfills later confirmed topics and preserves PvP topic order',()=>{
 const source=readFileSync(new URL('../app/api/board/route.ts',import.meta.url),'utf8');
 assert.match(source,/const missingTopics=confirmedTopics\.filter\(c=>!existingCharacters\.has\(c\.id\)\)/);
 assert.match(source,/db\.batch\(missingTopics\.map\(/);
 assert.match(source,/boards=confirmedTopics\.flatMap\(/);
 assert.doesNotMatch(source,/requested===current&&!boards\.length&&confirmedTopics\.length/);
});

test('corrupt discovery JSON is not silently treated as an empty state, while a missing first-run file can use defaults',async()=>{const dir=mkdtempSync(join(tmpdir(),'community-discovery-'));const path=join(dir,'state.json');try{assert.deepEqual(await readJson(path,{initialized:false}),{initialized:false});writeFileSync(path,'{broken','utf8');await assert.rejects(()=>readJson(path,{initialized:false}),SyntaxError);}finally{rmSync(dir,{recursive:true,force:true});}});

test('invalid or duplicate registry topics stop discovery instead of being silently removed',async()=>{const common={snapshot:snapshot('2026-10-01T00:00:00+09:00',rows),history:{snapshots:[]},state:initialState(),legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor};await assert.rejects(()=>updateCommunityCharacters({...common,registry:{schemaVersion:1,characters:[{id:'u2000e-alpha',name:'',image:'https://rangers.lerico.net/res/u2000e-alpha/u2000e-alpha-thum.png',releaseMonth:'2026-10',confirmed:true}]}}),/invalid community topic in registry/);await assert.rejects(()=>updateCommunityCharacters({...common,registry:{schemaVersion:1,characters:[{id:'u2000e-alpha',name:'A',image:'https://rangers.lerico.net/res/u2000e-alpha/u2000e-alpha-thum.png',releaseMonth:'2026-10',confirmed:true},{id:'u2000e-alpha',name:'B',image:'https://rangers.lerico.net/res/u2000e-alpha/u2000e-alpha-thum.png',releaseMonth:'2026-10',confirmed:true}]}}),/duplicate community topic in registry/);});

test('duplicate or malformed IDs in a complete snapshot do not create discovery candidates',async()=>{await assert.rejects(()=>updateCommunityCharacters({snapshot:snapshot('2026-10-01T00:00:00+09:00',[rows[0],rows[0]]),history:{snapshots:[]},registry:{schemaVersion:1,characters:[]},state:initialState(),legacyKnown:noLegacy,probe:async()=>true,verifyMetadata:metadataFor}),/duplicate character ID/);});
