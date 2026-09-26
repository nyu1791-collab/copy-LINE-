const SAFE_ID=/^u\d+e-[a-z0-9_-]+$/i;
const IMAGE_ROOT='https://rangers.lerico.net/res/';
const NOTICE_URL='https://notice2.line.me/LGRGS/ios/document/notice';
const NOTICE_SOURCE='notice2.line.me/LGRGS/ios/document/notice';

function isDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function isName(value){return typeof value==='string'&&!!value.trim()&&[...value].length<=80;}
function validEvidence(value,id,month,grade,nameEn){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.catalogId===id&&value.releaseMonth===month&&Number.isSafeInteger(value.noticeId)&&value.noticeId>0&&typeof value.noticeTitle==='string'&&/\bnew rangers? are here!?(?=\W|$)/i.test(value.noticeTitle)&&value.noticeUrl===NOTICE_URL&&value.source===NOTICE_SOURCE&&isDate(value.publishedAt)&&Number.isSafeInteger(value.grade)&&value.grade===grade&&value.matchedName===nameEn;
}

export function promotionLogEvent(topic){
 return {
  eventId:`${topic.releaseMonth}:${topic.id}`,
  eventType:'topic-promoted',
  id:topic.id,
  releaseMonth:topic.releaseMonth,
  name:topic.name,
  nameEn:topic.nameEn,
  nameZh:topic.nameZh,
  nameTh:topic.nameTh,
  image:topic.image,
  verifiedGrade:topic.verifiedGrade,
  releaseEvidence:topic.releaseEvidence,
  skillsVerified:true,
  skillCount:topic.skillCount,
  skillsVerifiedAt:topic.skillsVerifiedAt,
  observationCount:topic.observationCount,
  firstObservedAt:topic.firstObservedAt,
  confirmedAt:topic.confirmedAt,
 };
}

export function normalizeCommunityDiscoveryLog(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==1||!Array.isArray(raw.events))throw new Error('invalid community discovery log');
 const seen=new Set();
 for(const event of raw.events){
  if(!event||typeof event!=='object'||Array.isArray(event)||event.eventType!=='topic-promoted'||typeof event.id!=='string'||!SAFE_ID.test(event.id)||typeof event.releaseMonth!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(event.releaseMonth)||event.eventId!==`${event.releaseMonth}:${event.id}`||seen.has(event.eventId))throw new Error('invalid or duplicate community discovery log event');
  seen.add(event.eventId);
  if(!isName(event.name)||!isName(event.nameEn)||!isName(event.nameZh)||!isName(event.nameTh)||event.image!==IMAGE_ROOT+event.id+'/'+event.id+'-thum.png'||!Number.isSafeInteger(event.verifiedGrade)||event.verifiedGrade<1||event.verifiedGrade>20||event.skillsVerified!==true||!Number.isSafeInteger(event.skillCount)||event.skillCount<1||event.skillCount>3||!isDate(event.skillsVerifiedAt)||!Number.isSafeInteger(event.observationCount)||event.observationCount<3||!isDate(event.firstObservedAt)||!isDate(event.confirmedAt)||!validEvidence(event.releaseEvidence,event.id,event.releaseMonth,event.verifiedGrade,event.nameEn))throw new Error('invalid community discovery promotion evidence');
 }
 return structuredClone(raw);
}

function stableJson(value){
 if(Array.isArray(value))return value.map(stableJson);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableJson(value[key])]));
 return value;
}

export function auditCommunityDiscoveryLog(registry,rawLog){
 let log;
 try{log=normalizeCommunityDiscoveryLog(rawLog);}catch(error){return [error instanceof Error?error.message:'invalid community discovery log'];}
 if(!registry||typeof registry!=='object'||Array.isArray(registry)||!Array.isArray(registry.characters))return ['missing community registry for discovery log'];
 const events=new Map(log.events.map(event=>[event.eventId,event]));
 const topics=new Map(registry.characters.filter(topic=>topic?.source==='pvp-auto').map(topic=>[`${topic.releaseMonth}:${topic.id}`,topic]));
 const errors=[];
 for(const [eventId,event] of events){
  const topic=topics.get(eventId);
  if(!topic){errors.push('discovery log references a missing automatic topic '+event.id);continue;}
  if(JSON.stringify(stableJson(promotionLogEvent(topic)))!==JSON.stringify(stableJson(event)))errors.push('discovery log does not match the immutable topic evidence for '+event.id);
 }
 for(const [eventId,topic] of topics){
  if(!events.has(eventId))errors.push('automatic topic is missing from the append-only discovery log '+topic.id);
 }
 return errors;
}
