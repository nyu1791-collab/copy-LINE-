import {readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const ID=/^[A-Za-z0-9_-]{1,80}$/;
const NEW_ID=/^u\d+e-[a-z0-9_-]+$/i;
const IMAGE_ROOT='https://rangers.lerico.net/res/';

function monthParts(value){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const values=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {month:values.year+'-'+values.month,day:Number(values.day)};
}
export function auditCommunityRelease(snapshot,registry,state){
 const rankingErrors=[],communityErrors=[],warnings=[];
 const at=Date.parse(snapshot?.updated_at);
 if(!Number.isFinite(at))rankingErrors.push('invalid snapshot timestamp');
 if(snapshot?.target_players!==200||snapshot?.sampled_players!==200||snapshot?.complete_target!==true)rankingErrors.push('PvP snapshot is not a validated 200/200 sample');
 const rows=Array.isArray(snapshot?.characters)?snapshot.characters:null;
 if(!rows)rankingErrors.push('missing PvP character rankings');
 const ranked=new Map();let slots=0;
 for(const row of rows||[]){
  const id=row?.unit_code;
  if(typeof id!=='string'||!ID.test(id)||ranked.has(id)){rankingErrors.push('duplicate or invalid ranked unit ID');continue;}
  ranked.set(id,row);
  if(!Number.isSafeInteger(row.occurrence_count)||row.occurrence_count<1||!Number.isSafeInteger(row.player_count)||row.player_count<1||row.player_count>200||row.player_count>row.occurrence_count||!Number.isSafeInteger(row.rank)||row.rank<1){rankingErrors.push('invalid PvP counts or rank for '+id);continue;}
  slots+=row.occurrence_count;
 }
 if(rows&&slots!==snapshot.character_slots)rankingErrors.push('character occurrence total does not match character slots');
 if(rows&&snapshot.unique_characters!==rows.length)rankingErrors.push('unique character total does not match ranking');
 const {month,day}=Number.isFinite(at)?monthParts(at):{month:'unknown',day:0};
 const topics=Array.isArray(registry?.characters)?registry.characters:[];
 if(!Array.isArray(registry?.characters))communityErrors.push('missing community topic registry');
 const seen=new Set();let current=0,rankedTopics=0,skillVerified=0;
 for(const topic of topics){
  const id=topic?.id,topicMonth=topic?.releaseMonth,key=topicMonth+':'+id;
  if(typeof id!=='string'||!NEW_ID.test(id)||!/^(20\d\d)-(0[1-9]|1[0-2])$/.test(String(topicMonth))||seen.has(key)){communityErrors.push('duplicate or invalid community topic');continue;}
  seen.add(key);
  if(topicMonth!==month)continue;
  current++;
  const row=ranked.get(id);
  if(row)rankedTopics++;
  if(topic?.source==='pvp-auto'){
   if(topic.skillsVerified!==true||!Number.isSafeInteger(topic.skillCount)||topic.skillCount<1||topic.skillCount>3||!Number.isFinite(Date.parse(topic.skillsVerifiedAt))||!Number.isSafeInteger(topic.observationCount)||topic.observationCount<3)communityErrors.push('unverified skill or observation for '+id);
   else skillVerified++;
   if(topic.image!==IMAGE_ROOT+id+'/'+id+'-thum.png')communityErrors.push('unexpected character image for '+id);
   if(!topic.name||!topic.nameEn||!topic.nameZh)communityErrors.push('missing localized names for '+id);
   if(row&&topic.pvpRank!==row.rank)warnings.push('topic PvP rank has not refreshed for '+id);
  }
 }
 if(current>5)warnings.push('More than five confirmed topics in '+month+'; keep every verified character and review the release feed');
 if(day>=10&&current<3)warnings.push('Fewer than three confirmed topics in '+month+'; inspect the catalog and discovery candidates');
 if(state?.catalogStatus==='unavailable')warnings.push('Official Ranger catalog was temporarily unavailable; retry discovery on the next full sample');
 if(state?.catalogInitialized!==true)warnings.push('Official catalog baseline has not been established');
 const pending=Object.values(state?.candidates&&typeof state.candidates==='object'?state.candidates:{}).filter(candidate=>candidate&&typeof candidate==='object'&&candidate.firstSeenMonth===month);
 for(const candidate of pending){
  if(candidate.eligible!==true)warnings.push('New character is awaiting official metadata or image validation: '+candidate.id);
 }
 return {rankingErrors,communityErrors,warnings,month,rankedCharacters:ranked.size,currentTopics:current,rankedTopics,skillVerifiedTopics:skillVerified,pendingCandidates:pending.length};
}

async function main(){
 const [snapshot,registry,state]=await Promise.all([
  readFile('public/pvp/data/character_usage.json','utf8').then(JSON.parse),
  readFile('config/community-characters.json','utf8').then(JSON.parse),
  readFile('data/community-character-discovery.json','utf8').then(JSON.parse),
 ]);
 const report=auditCommunityRelease(snapshot,registry,state);
 const rankingOnly=process.argv.includes('--ranking-only');
 const failures=rankingOnly?report.rankingErrors:[...report.rankingErrors,...report.communityErrors];
 const summary=[
  '### Monthly character release audit',
  'JST month: '+report.month,
  'PvP ranked characters: '+report.rankedCharacters,
  'Separate character boards: '+report.currentTopics,
  'Boards with a current PvP rank: '+report.rankedTopics,
  'Automatically verified skill sets: '+report.skillVerifiedTopics,
  'Pending new character candidates: '+report.pendingCandidates,
  ...report.warnings.map(message=>'Warning: '+message),
  ...failures.map(message=>'Error: '+message),
 ].join('\n')+'\n';
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
 for(const warning of report.warnings)console.warn('::warning::'+warning);
 for(const failure of failures)console.error('::error::'+failure);
 if(failures.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
