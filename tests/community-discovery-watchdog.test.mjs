import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {assessCommunityRefreshHealth} from '../scripts/community-refresh-health.mjs';

const updatedAt='2026-10-01T00:00:00.000Z';
const emptyLog={schemaVersion:1,events:[]};
const emptyRegistry={schemaVersion:1,characters:[]};
function completeSnapshot(overrides={}){
 return {
  updated_at:updatedAt,
  target_players:200,
  sampled_players:200,
  complete_target:true,
  character_slots:3,
  unique_characters:2,
  characters:[
   {unit_code:'u1000e-alpha',rank:1,occurrence_count:2,player_count:2},
   {unit_code:'u1001e-beta',rank:2,occurrence_count:1,player_count:1},
  ],
  ...overrides,
 };
}
function completeState(overrides={}){
 return {
  schemaVersion:1,
  initialized:true,
  initializedAt:updatedAt,
  lastSnapshotAt:updatedAt,
  catalogInitialized:true,
  knownIds:[],
  knownCatalogIds:['u1000e-alpha'],
  catalogStatus:'verified',
  releaseNoticeStatus:'verified',
  candidates:{},
  ...overrides,
 };
}
function assess(overrides={}){
 return assessCommunityRefreshHealth({
  snapshot:completeSnapshot(),
  state:completeState(),
  registry:emptyRegistry,
  discoveryLog:emptyLog,
  now:Date.parse('2026-10-01T00:30:00.000Z'),
  ...overrides,
 });
}

test('a fresh, complete snapshot with aligned verified discovery state is healthy',()=>{
 const result=assess();
 assert.equal(result.action,'healthy');
 assert.equal(result.snapshotStatus,'fresh_complete');
 assert.equal(result.ageMinutes,30);
});

test('missing, stale, or incomplete PvP snapshots request a full collection',()=>{
 assert.equal(assess({snapshot:null}).action,'collection');
 assert.equal(assess({now:Date.parse('2026-10-01T01:00:00.000Z')}).reason,'snapshot_stale');
 assert.equal(assess({snapshot:completeSnapshot({sampled_players:199})}).reason,'snapshot_not_200_of_200');
});

test('bad counts and future timestamps stop for investigation instead of triggering writes',()=>{
 assert.equal(assess({snapshot:completeSnapshot({character_slots:99})}).action,'investigate');
 assert.equal(assess({snapshot:completeSnapshot({updated_at:'2026-10-01T01:00:00.000Z'})}).reason,'snapshot_timestamp_in_future');
});

test('fresh snapshots with discovery lag or unavailable official feeds request discovery retry',()=>{
 assert.equal(assess({state:completeState({lastSnapshotAt:'2026-09-30T23:00:00.000Z'})}).reason,'discovery_snapshot_out_of_sync');
 assert.equal(assess({state:completeState({releaseNoticeStatus:'unavailable'})}).reason,'official_discovery_verification_incomplete');
});

test('corrupt registry, state, ledger, or candidate data fails closed for investigation',()=>{
 assert.equal(assess({registry:null}).action,'investigate');
 assert.equal(assess({state:null}).action,'investigate');
 assert.equal(assess({discoveryLog:null}).action,'investigate');
 assert.equal(assess({state:completeState({candidates:{broken:{id:'wrong'}}})}).reason,'candidate_state_invalid');
});

test('watchdog and recovery workflows keep full collection and discovery writes bounded',()=>{
 const watchdog=readFileSync(new URL('../.github/workflows/community-discovery-watchdog.yml',import.meta.url),'utf8');
 const recovery=readFileSync(new URL('../.github/workflows/community-discovery-recovery.yml',import.meta.url),'utf8');
 const collector=readFileSync(new URL('../.github/workflows/refresh-pvp-data.yml',import.meta.url),'utf8');
 assert.match(watchdog,/cron: '27,57 \* \* \* \*'/);
 assert.match(watchdog,/"refresh-pvp-data\.yml"/);
 assert.match(watchdog,/"community-discovery-recovery\.yml"/);
 assert.match(recovery,/group: refresh-pvp-data/);
 assert.match(recovery,/--require-fresh-complete/);
 assert.match(recovery,/community_files=\(config\/community-characters\.json data\/community-character-discovery\.json data\/community-character-discovery-log\.json\)/);
 assert.doesNotMatch(recovery,/git add[^\n]*(?:public\/pvp|character_usage)/);
 assert.match(collector,/data\/community-character-discovery-log\.json/);
});
