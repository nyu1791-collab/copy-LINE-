export const dynamic='force-dynamic';

const SOURCES=[
 'https://line-rangers-fan.github.io/line-rangers-pvp/data/character_usage.json',
 'https://raw.githubusercontent.com/line-rangers-fan/line-rangers-pvp/main/docs/data/character_usage.json'
];
const MAX_BYTES=4*1024*1024;
const CACHE_TTL_MS=60_000;
const STALE_TTL_MS=10*60_000;

type JsonRecord=Record<string,unknown>;
type CacheEntry={data:unknown;expires:number;staleUntil:number};
let cache:CacheEntry|null=null;

function isRecord(value:unknown):value is JsonRecord{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function finite(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
function integer(value:unknown,fallback=0){const n=finite(value,fallback);return Number.isSafeInteger(n)?n:fallback;}
function text(value:unknown,fallback=''){return typeof value==='string'?value:fallback;}
function safeImage(value:unknown){if(typeof value!=='string')return '';try{const url=new URL(value);if(url.protocol!=='https:')return '';if(!['rangers.lerico.net','line-rangers-fan.github.io'].includes(url.hostname))return '';return url.toString();}catch{return '';}}
function compactChange(value:unknown){
 if(!isRecord(value))return null;
 const periods=isRecord(value.periods)?value.periods:{};
 const out:Record<string,unknown>={};
 for(const key of ['hour','day','week','month']){
  const raw=periods[key];if(!isRecord(raw))continue;
  out[key]={comparable:raw.comparable===true,rank:integer(raw.rank),occurrenceCount:integer(raw.occurrence_count),fromUpdatedAt:text(raw.from_updated_at),intervalMinutes:finite(raw.interval_minutes)};
 }
 return {new:value.new===true,rank:integer(value.rank),occurrenceCount:integer(value.occurrence_count),periods:out};
}
function compactEquipment(value:unknown){
 if(!isRecord(value))return {};
 const output:Record<string,unknown>={};
 for(const slot of ['WEAPON','ARMOR','ACC']){
  const raw=value[slot];if(!isRecord(raw))continue;
  const items=Array.isArray(raw.items)?raw.items.slice(0,10).flatMap(item=>{
   if(!isRecord(item))return [];
   const itemCode=text(item.item_code);if(!itemCode)return [];
   return [{itemCode,image:safeImage(item.image),rank:integer(item.rank),occurrenceCount:integer(item.occurrence_count),playerCount:integer(item.player_count),adoptionRate:finite(item.adoption_rate),change:compactChange(item.change)}];
  }):[];
  output[slot]={equippedOccurrenceCount:integer(raw.equipped_occurrence_count),equippedPlayerCount:integer(raw.equipped_player_count),items};
 }
 return output;
}
function compact(raw:unknown){
 if(!isRecord(raw)||!Array.isArray(raw.characters))throw new Error('invalid_snapshot');
 const sampled=integer(raw.sampled_players);const target=integer(raw.target_players);
 if(sampled<=0||target<=0)throw new Error('invalid_snapshot');
 const characters=raw.characters.flatMap((item,index)=>{
  if(!isRecord(item))return [];
  const unitCode=text(item.unit_code),name=text(item.name);if(!unitCode||!name)return [];
  return [{unitCode,name,image:safeImage(item.image),rank:index+1,occurrenceCount:integer(item.occurrence_count),playerCount:integer(item.player_count),adoptionRate:finite(item.adoption_rate),slotRate:finite(item.slot_rate),change:compactChange(item.change),equipmentRankings:compactEquipment(item.equipment_rankings)}];
 });
 if(!characters.length)throw new Error('invalid_snapshot');
 return {status:raw.complete_target===true?'fresh':'partial',source:'pvp_character_usage',league:text(raw.league,'レジェンド'),updatedAt:text(raw.updated_at),targetPlayers:target,sampledPlayers:sampled,characterSlots:integer(raw.character_slots),completeTarget:raw.complete_target===true,characters};
}
async function loadSource(url:string){
 const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(3500)});
 if(!response.ok)throw new Error('upstream');
 const length=Number(response.headers.get('content-length')||0);if(length>MAX_BYTES)throw new Error('too_large');
 const body=await response.text();if(body.length>MAX_BYTES)throw new Error('too_large');
 return compact(JSON.parse(body));
}
function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Accept-Encoding'}});}
export async function GET(){
 const now=Date.now();if(cache&&cache.expires>now)return reply(cache.data);
 for(const source of SOURCES){try{const data=await loadSource(source);cache={data,expires:now+CACHE_TTL_MS,staleUntil:now+STALE_TTL_MS};return reply(data);}catch{}}
 if(cache&&cache.staleUntil>now)return reply({...cache.data as JsonRecord,status:'stale'});
 return reply({status:'unavailable',error:'ranking_unavailable'},503);
}
