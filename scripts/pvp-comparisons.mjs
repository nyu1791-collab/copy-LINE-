const HOUR=60*60*1000;
const DAY=24*HOUR;
export const comparisonPeriods=['hour','day','week','month'];
const equipmentTypes=['WEAPON','ARMOR','ACC'];

function jstParts(date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}
function dayKey(date){const p=jstParts(date);return p.year+'-'+p.month+'-'+p.day;}
function previousSunday(now){
 const p=jstParts(now);
 const noon=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),12);
 const weekday=new Date(noon).getUTCDay();
 return dayKey(new Date(noon-(weekday||7)*DAY));
}
function previousMonthClose(now){
 const p=jstParts(now);
 return dayKey(new Date(Date.UTC(Number(p.year),Number(p.month)-1,0,12)));
}
function validHistory(snapshot){
 return snapshot&&Number.isFinite(Date.parse(snapshot.updated_at))&&Array.isArray(snapshot.characters)
  &&(snapshot.target_players===undefined||snapshot.target_players===200)
  &&(snapshot.sampled_players===undefined||snapshot.sampled_players===200)
  &&snapshot.complete_target!==false;
}
function assertValidHistory(snapshot){
 const seen=new Set();let slots=0;
 for(const row of snapshot.characters){
  if(typeof row?.unit_code!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.unit_code)||seen.has(row.unit_code)||!Number.isSafeInteger(row.occurrence_count)||row.occurrence_count<0||!Number.isSafeInteger(row.rank)||row.rank<1)throw new Error('corrupt comparison character history');
  seen.add(row.unit_code);slots+=row.occurrence_count;
  for(const type of equipmentTypes){
   if(!Array.isArray(row.equipment?.[type]))throw new Error('corrupt comparison equipment history');
   const items=new Set();
   for(const item of row.equipment[type]){
    if(typeof item?.item_code!=='string'||items.has(item.item_code)||!Number.isSafeInteger(item.occurrence_count)||item.occurrence_count<0||!Number.isSafeInteger(item.rank)||item.rank<1)throw new Error('corrupt comparison equipment history');
    items.add(item.item_code);
   }
  }
 }
 if(snapshot.character_slots!==undefined&&slots!==snapshot.character_slots)throw new Error('corrupt comparison slot history');
}
export function resolvePvPBaselines(history,now=new Date()){
 const eligible=history.filter(validHistory);
 for(const snapshot of eligible)assertValidHistory(snapshot);
 const closeFor=key=>eligible.filter(snapshot=>{
  const date=new Date(snapshot.updated_at),p=jstParts(date);
  return dayKey(date)===key&&(p.hour==='23'||p.hour==='22');
 }).sort((a,b)=>{
  const ah=jstParts(new Date(a.updated_at)).hour,bh=jstParts(new Date(b.updated_at)).hour;
  return Number(bh)-Number(ah)||Date.parse(b.updated_at)-Date.parse(a.updated_at);
 })[0]||null;
 const hourly=eligible.filter(snapshot=>{
  const age=now.getTime()-Date.parse(snapshot.updated_at);
  return age>=30*60*1000&&age<=90*60*1000;
 }).sort((a,b)=>{
  const da=Math.abs(now.getTime()-Date.parse(a.updated_at)-HOUR);
  const db=Math.abs(now.getTime()-Date.parse(b.updated_at)-HOUR);
  return da-db||Date.parse(b.updated_at)-Date.parse(a.updated_at);
 })[0]||null;
 return {
  hour:hourly,
  day:closeFor(dayKey(new Date(now.getTime()-DAY))),
  week:closeFor(previousSunday(now)),
  month:closeFor(previousMonthClose(now)),
 };
}

export function applyPvPComparisons(rows,history,now=new Date()){
 const baselines=resolvePvPBaselines(history,now);
 const maps=Object.fromEntries(comparisonPeriods.map(period=>[period,new Map((baselines[period]?.characters||[]).map(character=>[character.unit_code,character]))]));
 for(const row of rows){
  row.change={new:false,rank:0,occurrence_count:0,periods:{}};
  for(const period of comparisonPeriods){
   const baseline=baselines[period],previous=maps[period].get(row.unit_code);
   row.change.periods[period]=baseline?{
    comparable:true,rank:previous?Number(previous.rank||0)-row.rank:0,
    occurrence_count:row.occurrence_count-Number(previous?.occurrence_count||0),
    from_updated_at:baseline.updated_at,
    interval_minutes:Number(((now.getTime()-Date.parse(baseline.updated_at))/60000).toFixed(1)),
   }:{comparable:false,rank:0,occurrence_count:0,from_updated_at:null,interval_minutes:null};
  }
  for(const type of equipmentTypes){
   for(const item of row.equipment_rankings[type].items){
    item.change={periods:{}};
    for(const period of comparisonPeriods){
     const baseline=baselines[period],previous=maps[period].get(row.unit_code);
     const oldItem=previous?.equipment?.[type]?.find(entry=>entry.item_code===item.item_code);
     item.change.periods[period]=baseline?{
      comparable:true,rank:oldItem?Number(oldItem.rank||0)-item.rank:0,
      occurrence_count:item.occurrence_count-Number(oldItem?.occurrence_count||0),
      from_updated_at:baseline.updated_at,
     }:{comparable:false,rank:0,occurrence_count:0,from_updated_at:null};
    }
   }
  }
 }
 return baselines;
}
