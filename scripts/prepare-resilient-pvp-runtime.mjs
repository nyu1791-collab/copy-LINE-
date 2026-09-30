import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const COLLECTOR=resolve('scripts/collect-pvp.mjs');

function replaceOnce(text,oldText,newText,label){
  if(text.includes(newText))return {text,changed:false};
  if(!text.includes(oldText))throw new Error(`resilient PvP patch drift: ${label}`);
  const next=text.replace(oldText,newText);
  if(!next.includes(newText))throw new Error(`resilient PvP patch verification failed: ${label}`);
  return {text:next,changed:true};
}

const replacements=[
  [
    "if(mids.length!==TARGET)throw new Error(`refusing partial ranking: ${mids.length}/${TARGET}`);",
    "if(mids.length<1)throw new Error('ranking contained no usable player IDs');if(mids.length<TARGET)console.warn(`partial ranking accepted: ${mids.length}/${TARGET}`);",
    'ranking-size',
  ],
  [
    "if(failures.length||details.size!==TARGET)throw new Error(`refusing incomplete player details: ${details.size}/${TARGET}`);",
    "if(details.size<1)throw new Error('player detail collection returned no usable responses');if(failures.length||details.size!==mids.length)console.warn(`partial player details accepted: ${details.size}/${mids.length}, failures=${failures.length}`);",
    'detail-fetches',
  ],
  [
    "const players=[];let missingEquipment=0;\nfor(const mid of mids){const info=details.get(mid);const pvp=info?.playerUnitTeamGroupMap?.pvpteam;if(!pvp||typeof pvp!=='object'||Array.isArray(pvp))throw new Error('invalid pvpteam map');const records=[];for(const [,group] of Object.entries(pvp).sort(sortGroups)){if(!Array.isArray(group))throw new Error('invalid pvp group');for(const unit of group){const unitCode=String(unit?.unitCode||'').trim();if(!SAFE.test(unitCode))throw new Error('invalid unit code');const equipment={};const map=unit?.equipMap;if(map&&typeof map==='object'){for(const type of TYPES){const code=String(map?.[type]?.itemCode||'').trim();if(code){if(!SAFE.test(code))throw new Error('invalid equipment code');equipment[type]=code}else missingEquipment++}}else missingEquipment+=TYPES.length;records.push({unit_code:unitCode,equipment})}}\n  if(records.length<1||records.length>10)throw new Error(`invalid team size ${records.length}`);players.push({mid,records});\n}\nif(players.length!==TARGET)throw new Error('player validation failed');",
    "const players=[];let missingEquipment=0;const invalidPlayers=[];\nfor(const mid of mids){let playerMissingEquipment=0;try{const info=details.get(mid);const pvp=info?.playerUnitTeamGroupMap?.pvpteam;if(!pvp||typeof pvp!=='object'||Array.isArray(pvp))throw new Error('invalid pvpteam map');const records=[];for(const [,group] of Object.entries(pvp).sort(sortGroups)){if(!Array.isArray(group))throw new Error('invalid pvp group');for(const unit of group){const unitCode=String(unit?.unitCode||'').trim();if(!SAFE.test(unitCode))throw new Error('invalid unit code');const equipment={};const map=unit?.equipMap;if(map&&typeof map==='object'){for(const type of TYPES){const code=String(map?.[type]?.itemCode||'').trim();if(code){if(!SAFE.test(code))throw new Error('invalid equipment code');equipment[type]=code}else playerMissingEquipment++}}else playerMissingEquipment+=TYPES.length;records.push({unit_code:unitCode,equipment})}}if(records.length<1||records.length>10)throw new Error(`invalid team size ${records.length}`);players.push({mid,records});missingEquipment+=playerMissingEquipment}catch(error){invalidPlayers.push({mid,error:error instanceof Error?error.message:String(error)})}}\nif(players.length<1)throw new Error('no structurally valid player teams were collected');const sampledPlayers=players.length;const completeTarget=sampledPlayers===TARGET;if(!completeTarget)console.warn(`publishing clean partial PvP subset: ${sampledPlayers}/${TARGET}; omitted=${TARGET-sampledPlayers}`);",
    'player-validation',
  ],
  [
    "adoption_rate:Number((playerCount/TARGET*100).toFixed(1))",
    "adoption_rate:Number((playerCount/sampledPlayers*100).toFixed(1))",
    'adoption-denominator',
  ],
  [
    "const oldHistory=JSON.parse(await readFile(HISTORY,'utf8'));\nif(oldHistory?.schema_version!==1||!Array.isArray(oldHistory.snapshots))throw new Error('corrupt comparison history document');\nconst snapshots=oldHistory.snapshots;",
    "let oldHistory={schema_version:1,reference_mode:'jst_calendar_close_v1',snapshots:[]};let historyHealthy=true;try{const parsed=JSON.parse(await readFile(HISTORY,'utf8'));if(parsed?.schema_version!==1||!Array.isArray(parsed.snapshots))throw new Error('invalid comparison history shape');oldHistory=parsed}catch(error){historyHealthy=false;console.warn(`comparison history unavailable; preserving it unchanged and publishing without comparisons: ${error instanceof Error?error.message:String(error)}`)}\nconst snapshots=oldHistory.snapshots;",
    'history-read',
  ],
  [
    "applyPvPComparisons(rows,snapshots,now);",
    "applyPvPComparisons(rows,completeTarget&&historyHealthy?snapshots:[],now);",
    'comparison-policy',
  ],
  [
    "const output={schema_version:11,updated_at:updatedAt,source:{name:'LINE Rangers Handbook PvP Tracker',url:'https://rangers.lerico.net/ja/pvp-tracker'},league:'レジェンド',target_players:TARGET,sampled_players:TARGET,character_slots:totalSlots,unique_characters:rows.length,complete_target:true,collection_quality:{sample_coverage:100,equipment_slots_expected:totalSlots*TYPES.length,equipment_slots_missing:missingEquipment,detail_fetch_failures:0,invalid_player_records:0,collection_started_at:new Date(started).toISOString(),collection_duration_seconds:Number(((Date.now()-started)/1000).toFixed(2))},characters:rows};\nif(output.character_slots<1500||output.character_slots>TARGET*10||output.unique_characters<10)throw new Error('quality gate rejected implausible aggregate');",
    "const output={schema_version:11,updated_at:updatedAt,source:{name:'LINE Rangers Handbook PvP Tracker',url:'https://rangers.lerico.net/ja/pvp-tracker'},league:'レジェンド',target_players:TARGET,sampled_players:sampledPlayers,character_slots:totalSlots,unique_characters:rows.length,complete_target:completeTarget,publication_mode:completeTarget?'complete':'partial_available',collection_quality:{sample_coverage:Number((sampledPlayers/TARGET*100).toFixed(1)),equipment_slots_expected:totalSlots*TYPES.length,equipment_slots_missing:missingEquipment,detail_fetch_failures:failures.length,invalid_player_records:invalidPlayers.length,ranking_records_missing:Math.max(0,TARGET-mids.length),comparison_history_healthy:historyHealthy,collection_started_at:new Date(started).toISOString(),collection_duration_seconds:Number(((Date.now()-started)/1000).toFixed(2))},characters:rows};\nif(output.character_slots<1||output.character_slots>sampledPlayers*10||output.unique_characters<1)throw new Error('quality gate rejected empty or impossible aggregate');",
    'output-quality',
  ],
  [
    "const compact={updated_at:updatedAt,target_players:TARGET,sampled_players:TARGET,complete_target:true,character_slots:totalSlots,characters:rows.map(row=>({unit_code:row.unit_code,rank:row.rank,occurrence_count:row.occurrence_count,equipment:Object.fromEntries(TYPES.map(type=>[type,row.equipment_rankings[type].items.map(x=>({item_code:x.item_code,rank:x.rank,occurrence_count:x.occurrence_count}))]))}))};\nconst combined=[...snapshots,compact].sort((a,b)=>Date.parse(a.updated_at)-Date.parse(b.updated_at));",
    "const compact={updated_at:updatedAt,target_players:TARGET,sampled_players:sampledPlayers,complete_target:completeTarget,character_slots:totalSlots,characters:rows.map(row=>({unit_code:row.unit_code,rank:row.rank,occurrence_count:row.occurrence_count,equipment:Object.fromEntries(TYPES.map(type=>[type,row.equipment_rankings[type].items.map(x=>({item_code:x.item_code,rank:x.rank,occurrence_count:x.occurrence_count}))]))}))};\nconst combined=completeTarget&&historyHealthy?[...snapshots,compact].sort((a,b)=>Date.parse(a.updated_at)-Date.parse(b.updated_at)):[...snapshots];",
    'history-append',
  ],
  [
    "await atomicJson(OUTPUT,output);await atomicJson(HISTORY,{schema_version:1,reference_mode:'jst_calendar_close_v1',snapshots:pruned});\nconsole.log(`Published validated PvP snapshot: ${TARGET}/${TARGET}, ${rows.length} characters, ${totalSlots} slots.`);",
    "await atomicJson(OUTPUT,output);if(completeTarget&&historyHealthy)await atomicJson(HISTORY,{schema_version:1,reference_mode:'jst_calendar_close_v1',snapshots:pruned});\nconsole.log(`Published validated PvP snapshot: ${sampledPlayers}/${TARGET} ${completeTarget?'complete':'partial'}, ${rows.length} characters, ${totalSlots} slots.`);",
    'atomic-publication',
  ],
];

let source=await readFile(COLLECTOR,'utf8');
let changed=false;
for(const [oldText,newText,label] of replacements){
  const result=replaceOnce(source,oldText,newText,label);
  source=result.text;
  changed ||= result.changed;
}
if(changed){
  await writeFile(COLLECTOR,source,'utf8');
  console.log('Applied resilient PvP partial-publication runtime policy.');
}else{
  console.log('Resilient PvP runtime policy already present.');
}
