import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {applyPvPComparisons,resolvePvPBaselines} from '../scripts/pvp-comparisons.mjs';

function baseline(updated_at,characters=[]){return {updated_at,target_players:200,sampled_players:200,complete_target:true,characters:characters.map(row=>({...row,equipment:row.equipment||{WEAPON:[],ARMOR:[],ACC:[]}}))};}
function newCharacter(){return {unit_code:'u2000e-new',rank:2,occurrence_count:3,equipment_rankings:{
 WEAPON:{items:[{item_code:'sword',rank:1,occurrence_count:2}]},
 ARMOR:{items:[]},ACC:{items:[]},
}};}

test('a new ranked character compares against zero when the complete snapshot exists',()=>{
 const now=new Date('2026-10-05T03:00:00.000Z'); // Monday 12:00 JST
 const history=[
  baseline('2026-10-05T02:00:00.000Z',[{unit_code:'u1000e-old',rank:1,occurrence_count:5}]),
  baseline('2026-10-04T14:05:00.000Z'),
  baseline('2026-09-30T14:10:00.000Z'),
 ];
 const row=newCharacter();
 const periods=applyPvPComparisons([row],history,now);
 assert.equal(periods.week.updated_at,'2026-10-04T14:05:00.000Z');
 for(const name of ['hour','day','week','month']){
  assert.equal(row.change.periods[name].comparable,true,name);
  assert.equal(row.change.periods[name].occurrence_count,3,name);
  assert.equal(row.equipment_rankings.WEAPON.items[0].change.periods[name].occurrence_count,2,name);
 }
});

test('history wait only applies when there is no qualifying complete snapshot',()=>{
 const row=newCharacter();
 applyPvPComparisons([row],[],new Date('2026-10-05T03:00:00.000Z'));
 for(const name of ['hour','day','week','month'])assert.equal(row.change.periods[name].comparable,false);
});

test('hourly selection accepts actual ages of 30 to 90 minutes',()=>{
 const now=new Date('2026-10-05T03:00:00.000Z');
 const matches=resolvePvPBaselines([
  baseline('2026-10-05T02:31:00.000Z'),
  baseline('2026-10-05T01:29:00.000Z'),
  baseline('2026-10-05T01:45:00.000Z'),
  baseline('2026-10-05T02:10:00.000Z'),
 ],now);
 assert.equal(matches.hour.updated_at,'2026-10-05T02:10:00.000Z');
});

test('a partial sample or malformed history stops publication instead of replacing the baseline',()=>{
 const partial={...baseline('2026-10-05T02:00:00.000Z'),sampled_players:199};
 assert.throws(()=>resolvePvPBaselines([partial],new Date('2026-10-05T03:00:00.000Z')),/partial sample stored/);
 assert.throws(()=>resolvePvPBaselines([{updated_at:'bad',characters:[]}]),/corrupt comparison history document/);
 assert.throws(()=>resolvePvPBaselines(null),/corrupt comparison history document/);
 const collector=readFileSync(new URL('../scripts/collect-pvp.mjs',import.meta.url),'utf8');
 assert.match(collector,/JSON\.parse\(await readFile\(HISTORY,'utf8'\)\)/);
 assert.doesNotMatch(collector,/readJson\(HISTORY,\{schema_version:1,snapshots:\[\]\}\)/);
});

test('previous Sunday and previous month use JST closes, falling back from 23 to 22',()=>{
 const now=new Date('2027-01-04T03:00:00.000Z'); // Monday 12:00 JST
 const history=[
  baseline('2027-01-03T13:50:00.000Z'), // Sunday 22:50 JST
  baseline('2026-12-31T14:10:00.000Z'),
  baseline('2026-12-27T14:10:00.000Z'),
 ];
 const periods=resolvePvPBaselines(history,now);
 assert.equal(periods.day.updated_at,'2027-01-03T13:50:00.000Z');
 assert.equal(periods.week.updated_at,'2027-01-03T13:50:00.000Z');
 assert.equal(periods.month.updated_at,'2026-12-31T14:10:00.000Z');
});

test('corrupt history never yields fabricated deltas or overwrites a fresh snapshot',()=>{
 const now=new Date('2026-10-05T03:00:00.000Z');
 const broken=baseline('2026-10-05T02:00:00.000Z',[{unit_code:'u2000e-new',rank:1,occurrence_count:-4}]);
 assert.throws(()=>applyPvPComparisons([newCharacter()],[broken],now),/corrupt comparison character history/);
 const missingEquipment=baseline('2026-10-05T02:00:00.000Z',[{unit_code:'u2000e-new',rank:1,occurrence_count:3,equipment:{WEAPON:[],ARMOR:[]}}]);
 assert.throws(()=>applyPvPComparisons([newCharacter()],[missingEquipment],now),/corrupt comparison equipment history/);
});
