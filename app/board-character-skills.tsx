'use client';
/* eslint-disable @next/next/no-img-element -- Trusted Ranger skill icons use lazy native image loading. */
import {useEffect,useState} from 'react';
import type {Language} from '@/lib/rules';
import type {RangerInfo} from '@/lib/ranger-info';
import {boardCharacterSkillDetails,boardSourceSkillDetails} from '@/lib/board-character-skill-details';

const wording={
 ja:{title:'スキル情報',effects:'効果',scrollHint:'横スワイプで他のスキル',loading:'スキル情報を読み込み中…',unavailable:'スキル情報を現在取得できません。意見欄は利用できます。',retry:'再取得',discussion:'このキャラ専用の意見・投票・動画です。'},
 en:{title:'Skills',effects:'Effects',scrollHint:'Swipe for more skills',loading:'Loading skills…',unavailable:'Skills are temporarily unavailable. This character’s discussion is still available.',retry:'Retry',discussion:'Opinions, votes and videos here belong to this character only.'},
 zh:{title:'技能資訊',effects:'效果',scrollHint:'左右滑動看其他技能',loading:'正在載入技能…',unavailable:'暫時無法取得技能資訊。仍可查看此角色的討論。',retry:'重試',discussion:'此處的意見、投票與影片僅屬於這名角色。'},
 th:{title:'ข้อมูลสกิล',effects:'เอฟเฟกต์',scrollHint:'ปัดเพื่อดูสกิลอื่น',loading:'กำลังโหลดสกิล…',unavailable:'ยังโหลดข้อมูลสกิลไม่ได้ แต่กระดานของตัวละครนี้ยังใช้งานได้',retry:'ลองอีกครั้ง',discussion:'ความคิดเห็น โหวต และวิดีโอในหน้านี้เป็นของตัวละครนี้เท่านั้น'},
} satisfies Record<Language,Record<string,string>>;

export function boardDiscussionNote(language:Language){return wording[language].discussion;}

function skillIcon(value:string|null){
 if(!value)return null;
 try{const url=new URL(value);return url.origin==='https://rangers.lerico.net'&&/^\/res\/skill_icon\/[A-Za-z0-9._-]+$/.test(url.pathname)&&!url.search&&!url.hash?url.href:null;}catch{return null;}
}
function sourceLink(value:string,unitCode:string,language:Language){
 const sourceLanguage=language==='th'?'en':language;
 const expected='https://rangers.lerico.net/'+sourceLanguage+'/ranger/'+encodeURIComponent(unitCode);
 return value===expected?expected:null;
}
type Result={key:string;info:RangerInfo|null;error:boolean};

export default function BoardCharacterSkills({unitCode,language,displayName}:{unitCode:string;language:Language;displayName:string}){
 const [result,setResult]=useState<Result>({key:'',info:null,error:false});
 const [attempt,setAttempt]=useState(0);
 const key=language+':'+unitCode+':'+attempt;
 const copy=wording[language];
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){
   try{
    const response=await fetch('/api/ranger-info?unit='+encodeURIComponent(unitCode)+'&lang='+language,{
     cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
    });
    if(!response.ok)throw new Error('ranger_info_unavailable');
    const info=await response.json() as RangerInfo;
    if(info.unitCode!==unitCode||info.language!==language||!Array.isArray(info.skills)||!info.skills.length||info.skills.length>3||!sourceLink(info.sourceUrl,unitCode,language))throw new Error('invalid_ranger_info');
    if(info.skills.some(skill=>typeof skill.name!=='string'||!skill.name.trim()||!Array.isArray(skill.effects)||skill.effects.some(effect=>typeof effect!=='string')))throw new Error('invalid_skill');
    if(!controller.signal.aborted)setResult({key,info,error:false});
   }catch{
    if(!controller.signal.aborted)setResult({key,info:null,error:true});
   }
  }
  void load();
  return()=>controller.abort();
 },[key,unitCode,language,attempt]);
 const ready=result.key===key;
 const info=ready?result.info:null;
 return <section className="board-skills" aria-label={displayName+' · '+copy.title}>
  <div className="board-skills-heading"><h2>{displayName} · {copy.title}</h2></div>
  {!ready?<p role="status">{copy.loading}</p>:result.error||!info?<p role="status">{copy.unavailable} <button type="button" onClick={()=>setAttempt(value=>value+1)}>{copy.retry}</button></p>:
   <>
   {info.skills.length>1&&<p className="board-skill-scroll-hint">{copy.scrollHint}</p>}
   <div className="board-skill-scroller" role="region" aria-label={displayName+' · '+copy.title} tabIndex={info.skills.length>1?0:undefined}>
   <div className="board-skill-list">{info.skills.map((skill,index)=>{
    const icon=skillIcon(skill.iconUrl);
    const details=boardCharacterSkillDetails(unitCode,index,info.skills.length,skill.effects.length,language)||boardSourceSkillDetails(skill.details,skill.effects.length,language);
    return <article className="board-skill" key={skill.name}>
     <div className="board-skill-heading">{icon&&<img src={icon} alt="" width="48" height="48" loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true;}}/>}<h3>{skill.name}</h3></div>
     {details?<div className="board-skill-details">
      <div className="board-skill-detail-meta" aria-label={skill.name+' '+details.labels.details}>
       <span>{details.labels.probability} <strong>{details.probability}</strong></span>
       <span>{details.labels.cooldown} <strong>{details.cooldown}</strong></span>
      </div>
      <div className="board-skill-detail-table" role="table" aria-label={skill.name+' '+details.labels.details}>
       <div className="board-skill-detail-row board-skill-detail-head" role="row">
        <span role="columnheader">{details.labels.effect}</span>
        <span role="columnheader">{details.labels.area}</span>
        <span role="columnheader">{details.labels.factor}</span>
        <span role="columnheader">{details.labels.duration}</span>
       </div>
       {details.rows.map((row,rowIndex)=><div className="board-skill-detail-row" role="row" key={rowIndex}>
        <span role="rowheader">{row.effect}</span>
        <span role="cell">{row.area}</span>
        <span role="cell">{row.factor}</span>
        <span role="cell">{row.duration}</span>
       </div>)}
      </div>
     </div>:!!skill.effects.length&&<div className="board-skill-effects"><h4>{copy.effects}</h4><ul>{skill.effects.map((effect,index)=><li key={index}>{effect}</li>)}</ul></div>}
    </article>;
   })}</div></div></>}
 </section>;
}
