'use client';
/* eslint-disable @next/next/no-img-element -- Trusted Ranger skill icons use lazy native image loading. */
import {useEffect,useState} from 'react';
import type {Language} from '@/lib/rules';
import type {RangerInfo} from '@/lib/ranger-info';

const wording={
 ja:{title:'スキル情報',description:'スキル説明',effects:'スキル効果',scrollHint:'横スクロールで他のスキルを見る',loading:'スキル情報を読み込み中…',unavailable:'スキル情報を現在取得できません。意見欄は利用できます。',retry:'再取得',source:'取得元を見る',discussion:'このキャラ専用の意見・投票・動画です。'},
 en:{title:'Skills',description:'Description',effects:'Skill effects',scrollHint:'Swipe to see other skills',loading:'Loading skills…',unavailable:'Skills are temporarily unavailable. This character’s discussion is still available.',retry:'Retry',source:'View source',discussion:'Opinions, votes and videos here belong to this character only.'},
 zh:{title:'技能資訊',description:'技能說明',effects:'技能效果',scrollHint:'橫向滑動查看更多技能',loading:'正在載入技能…',unavailable:'暫時無法取得技能資訊。仍可查看此角色的討論。',retry:'重試',source:'查看來源',discussion:'此處的意見、投票與影片僅屬於這名角色。'},
 th:{title:'ข้อมูลสกิล',description:'คำอธิบายสกิล',effects:'เอฟเฟกต์สกิล',scrollHint:'เลื่อนด้านข้างเพื่อดูสกิลเพิ่มเติม',loading:'กำลังโหลดสกิล…',unavailable:'ยังโหลดข้อมูลสกิลไม่ได้ แต่กระดานของตัวละครนี้ยังใช้งานได้',retry:'ลองอีกครั้ง',source:'ดูแหล่งข้อมูล',discussion:'ความคิดเห็น โหวต และวิดีโอในหน้านี้เป็นของตัวละครนี้เท่านั้น'},
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
    if(info.skills.some(skill=>typeof skill.name!=='string'||!skill.name.trim()||typeof skill.description!=='string'||!Array.isArray(skill.effects)||skill.effects.some(effect=>typeof effect!=='string')))throw new Error('invalid_skill');
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
  <div className="board-skills-heading"><h2>{displayName} · {copy.title}</h2>{info&&<a href={sourceLink(info.sourceUrl,unitCode,language)||undefined} target="_blank" rel="noopener noreferrer">{copy.source}</a>}</div>
  {!ready||!info&&!result.error?<p role="status">{copy.loading}</p>:result.error?<p role="status">{copy.unavailable} <button type="button" onClick={()=>setAttempt(value=>value+1)}>{copy.retry}</button></p>:
   <>
   {info.skills.length>1&&<p className="board-skill-scroll-hint">{copy.scrollHint}</p>}
   <div className="board-skill-scroller" role="region" aria-label={copy.title} tabIndex={info.skills.length>1?0:undefined}>
   <div className="board-skill-list">{info.skills.map((skill,index)=>{
    const icon=skillIcon(skill.iconUrl);
    return <article className="board-skill" key={index}>
     <div className="board-skill-heading">{icon&&<img src={icon} alt="" width="48" height="48" loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true;}}/>}<h3>{skill.name}</h3></div>
     <h4>{copy.description}</h4><p>{skill.description}</p>
     {!!skill.effects.length&&<div className="board-skill-effects"><h4>{copy.effects}</h4><ul>{skill.effects.map((effect,i)=><li key={i}>{effect}</li>)}</ul></div>}
    </article>;
   })}</div></div></>}
 </section>;
}
