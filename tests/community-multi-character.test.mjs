import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {updateCommunityCharacters} from '../scripts/update-community-characters.mjs';

function snapshot(updatedAt,rows){
 return {
  complete_target:true,
  target_players:200,
  sampled_players:200,
  updated_at:updatedAt,
  characters:rows,
 };
}

const rows=[
 {unit_code:'u2000e-alpha',name:'新キャラ Alpha',image:'https://rangers.lerico.net/res/u2000e-alpha/u2000e-alpha-thum.png',rank:4,adoption_rate:24.5},
 {unit_code:'u2001e-beta',name:'新キャラ Beta',image:'https://rangers.lerico.net/res/u2001e-beta/u2001e-beta-thum.png',rank:11,adoption_rate:12.0},
];
const legacyKnown={ids:[]};

test('multiple new characters are confirmed together without replacing each other',async()=>{
 let registry={schemaVersion:1,characters:[]};
 let state={schemaVersion:1,initialized:true,initializedAt:'2026-09-30T14:00:00.000Z',lastSnapshotAt:'2026-09-30T14:00:00.000Z',knownIds:['u1000e-old'],candidates:{}};
 const probe=async()=>true;
 for(const updatedAt of ['2026-10-01T00:00:00+09:00','2026-10-01T01:00:00+09:00']){
  const result=await updateCommunityCharacters({snapshot:snapshot(updatedAt,rows),history:{snapshots:[]},registry,state,legacyKnown,probe});
  registry=result.registry;state=result.state;
  assert.equal(result.promoted.length,0);
 }
 const final=await updateCommunityCharacters({snapshot:snapshot('2026-10-01T02:00:00+09:00',rows),history:{snapshots:[]},registry,state,legacyKnown,probe});
 assert.deepEqual(final.promoted.map(topic=>topic.id),['u2000e-alpha','u2001e-beta']);
 assert.deepEqual(final.registry.characters.map(topic=>topic.id),['u2000e-alpha','u2001e-beta']);
 assert.equal(new Set(final.registry.characters.map(topic=>topic.id)).size,2);
 assert.ok(final.registry.characters.every(topic=>topic.releaseMonth==='2026-10'&&topic.confirmed===true));
});

test('board API backfills later confirmed topics and preserves PvP topic order',()=>{
 const source=readFileSync(new URL('../app/api/board/route.ts',import.meta.url),'utf8');
 assert.match(source,/const missingTopics=confirmedTopics\.filter\(c=>!existingCharacters\.has\(c\.id\)\)/);
 assert.match(source,/db\.batch\(missingTopics\.map\(/);
 assert.match(source,/boards=confirmedTopics\.flatMap\(/);
 assert.doesNotMatch(source,/requested===current&&!boards\.length&&confirmedTopics\.length/);
});
