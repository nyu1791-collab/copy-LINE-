import {confirmedCharactersForMonth,monthJST,validMonth} from '@/lib/rules';

export const dynamic='force-dynamic';

// Read the same published snapshot used by the original PvP ranking. The raw
// GitHub URL is retained only as a secondary source for environments where it
// is reachable. Community failures never mutate the canonical PvP data.
const SOURCE_URLS=[
 'https://line-rangers-fan.github.io/line-rangers-pvp/data/character_usage.json',
 'https://raw.githubusercontent.com/line-rangers-fan/line-rangers-pvp/main/docs/data/character_usage.json'
];
const CACHE_TTL_MS=60_000;
const STALE_TTL_MS=5*60_000;
const cache=new Map<string,{data:PvpResponse;expires:number;staleUntil:number}>();

type EquipmentItem={itemCode:string;image:string|null;rank:number;occurrenceCount:number;playerCount:number;adoptionRate:number};
type EquipmentGroup={equippedOccurrenceCount:number;equippedPlayerCount:number;items:EquipmentItem[]};
type PvpResponse={status:'fresh'|'stale';source:'pvp_character_usage';month:string;character:{unitCode:string;name:string;image:string;rank:number;occurrenceCount:number;playerCount:number;adoptionRate:number;slotRate:number;equipmentRankings:Record<string,EquipmentGroup>};snapshot:{updatedAt:string;targetPlayers:number;sampledPlayers:number;completeTarget:boolean;collectionQuality:number|null}};
type JsonRecord=Record<string,unknown>;

const COPIED_SALLY_SNAPSHOT:PvpResponse={
 status:'stale',source:'pvp_character_usage',month:'2026-09',
 character:{
  unitCode:'u1631e-sally',name:'かに座 サリー',
  image:'https://rangers.lerico.net/res/u1631e-sally/u1631e-sally-thum.png',
  rank:0,occurrenceCount:64,playerCount:64,adoptionRate:32.0,slotRate:3.22,equipmentRankings:{}
 },
 snapshot:{updatedAt:'2026-09-15T03:01:07.466207+00:00',targetPlayers:200,sampledPlayers:200,completeTarget:true,collectionQuality:100.0}
};

function number(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
function integer(value:unknown,fallback=0){const result=number(value,fallback);return Number.isSafeInteger(result)?result:fallback;}
function safeHttpsImage(value:unknown){if(typeof value!=='string')return null;try{const url=new URL(value);if(url.protocol!=='https:')return null;if(!['rangers.lerico.net','line-rangers-fan.github.io'].includes(url.hostname))return null;return url.toString();}catch{return null;}}
function compactEquipment(value:unknown):Record<string,EquipmentGroup>{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const output:Record<string,EquipmentGroup>={};
 for(const [slot,raw] of Object.entries(value as JsonRecord)){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const group=raw as JsonRecord;
  const items=Array.isArray(group.items)?group.items.slice(0,5).flatMap(item=>{
   if(!item||typeof item!=='object'||Array.isArray(item))return [];
   const row=item as JsonRecord;const itemCode=typeof row.item_code==='string'?row.item_code:'';
   if(!itemCode)return [];
   return [{itemCode,image:safeHttpsImage(row.image),rank:integer(row.rank),occurrenceCount:integer(row.occurrence_count),playerCount:integer(row.player_count),adoptionRate:number(row.adoption_rate)}];
  }):[];
  output[slot]={equippedOccurrenceCount:integer(group.equipped_occurrence_count),equippedPlayerCount:integer(group.equipped_player_count),items};
 }
 return output;
}
function compactSnapshot(raw:unknown,month:string,topic:{id:string;name:string;image:string}) : PvpResponse|null {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const root=raw as JsonRecord;const characters=Array.isArray(root.characters)?root.characters:[];
 const record=characters.find(item=>item&&typeof item==='object'&&!Array.isArray(item)&&(item as JsonRecord).unit_code===topic.id) as JsonRecord|undefined;
 if(!record)return null;
 const quality=root.collection_quality&&typeof root.collection_quality==='object'&&!Array.isArray(root.collection_quality)?(root.collection_quality as JsonRecord).sample_coverage:null;
 const collectionQuality=typeof quality==='number'&&Number.isFinite(quality)?quality:null;
 const rowIndex=characters.findIndex(item=>item===record);
 const explicitRank=integer(record.rank);
 const rank=explicitRank>0?explicitRank:(rowIndex>=0?rowIndex+1:0);
 return {status:'fresh',source:'pvp_character_usage',month,character:{unitCode:topic.id,name:topic.name,image:safeHttpsImage(record.image)||topic.image,rank,occurrenceCount:integer(record.occurrence_count),playerCount:integer(record.player_count),adoptionRate:number(record.adoption_rate),slotRate:number(record.slot_rate),equipmentRankings:compactEquipment(record.equipment_rankings)},snapshot:{updatedAt:typeof root.updated_at==='string'?root.updated_at:'',targetPlayers:integer(root.target_players),sampledPlayers:integer(root.sampled_players),completeTarget:root.complete_target===true,collectionQuality}};
}
function json(data:unknown,status=200,cacheControl='private, no-store'){
 return Response.json(data,{status,headers:{'Cache-Control':cacheControl,'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Accept-Encoding'}});
}
function copiedFallback(month:string,character:string){
 if(month===COPIED_SALLY_SNAPSHOT.month&&character===COPIED_SALLY_SNAPSHOT.character.unitCode)return COPIED_SALLY_SNAPSHOT;
 return null;
}
async function loadSnapshot(month:string,topic:{id:string;name:string;image:string}){
 for(const source of SOURCE_URLS){
  try{const upstream=await fetch(source,{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(2500)});if(!upstream.ok)continue;const result=compactSnapshot(await upstream.json(),month,topic);if(result)return result;}catch{}
 }
 return null;
}
export async function GET(request:Request){
 const url=new URL(request.url);const current=monthJST();const month=url.searchParams.get('month')||current;const character=url.searchParams.get('character')||'';
 if(!validMonth(month)||month>current)return json({error:'invalid_request'},400,'no-store');
 const topic=confirmedCharactersForMonth(month).find(item=>item.id===character);
 if(!topic)return json({error:'not_found'},404,'no-store');
 const key=`${month}:${topic.id}`;const now=Date.now();const existing=cache.get(key);
 if(existing&&existing.expires>now)return json(existing.data);
 const result=await loadSnapshot(month,topic);
 if(result){const fresh={data:result,expires:now+CACHE_TTL_MS,staleUntil:now+STALE_TTL_MS};cache.set(key,fresh);return json(result);}
 if(existing&&existing.staleUntil>now)return json({...existing.data,status:'stale'});
 const copied=copiedFallback(month,topic.id);
 if(copied)return json(copied,200,'private, no-store');
 return json({status:'unavailable',error:'unavailable'},503,'no-store');
}
