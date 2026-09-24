const UNIT_CODE_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
const CATALOG_CODE_PATTERN=/^[A-Za-z0-9_-]{1,120}$/;
const ICON_RESOURCE_PATTERN=/^[A-Za-z0-9._-]{1,180}$/;
const HANDBOOK_ORIGIN='https://rangers.lerico.net';

export type RangerInfoLanguage='ja'|'en'|'zh'|'th';
export type RangerSkillInfo={
 name:string;
 description:string;
 effects:string[];
 iconUrl:string|null;
 details?:SourceSkillDetails;
};
export type SourceSkillDetails={probability:number;cooldownSeconds:number;rows:Array<{effect:string;area:number|null;factor:string|null;durationSeconds:number|null}>};
export type RangerInfo={unitCode:string;language:RangerInfoLanguage;name:string;skills:RangerSkillInfo[];sourceUrl:string};

type BasicRanger={
 unitCode?:unknown;
 unitNameCode?:unknown;
 grade?:unknown;
 isTranscendentUnit?:unknown;
 isHyperUnit?:unknown;
 skillCode?:unknown;
 skillCode2?:unknown;
 skillCode3?:unknown;
};
type SkillRow={
 skillCode?:unknown;
 nameCode?:unknown;
 descriptionCode?:unknown;
 iconResourcePath?:unknown;
 probability?:unknown;
 skillDelayTime?:unknown;
 range?:unknown;
 subSkills?:unknown;
};

export function validRangerUnitCode(value:string){return UNIT_CODE_PATTERN.test(value);}
export function validRangerInfoLanguage(value:string):value is RangerInfoLanguage{return value==='ja'||value==='en'||value==='zh'||value==='th';}

function rangerDetailLanguage(language:RangerInfoLanguage){return language==='th'?'en':language;}
export function rangerDetailUrl(unitCode:string,language:RangerInfoLanguage='ja'){
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 return `${HANDBOOK_ORIGIN}/${rangerDetailLanguage(language)}/ranger/${encodeURIComponent(unitCode)}`;
}

function cleanText(value:unknown,max:number){
 if(typeof value!=='string')return '';
 return value
  .replace(/\\n/g,'\n')
  .replace(/\r\n?/g,'\n')
  .replace(/[\t ]+/g,' ')
  .replace(/ *\n */g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim()
  .slice(0,max);
}
function record(value:unknown):Record<string,unknown>|null{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function safeCatalogCode(value:unknown){
 return typeof value==='string'&&CATALOG_CODE_PATTERN.test(value)?value:'';
}
function safeIconResource(value:unknown){
 return typeof value==='string'&&ICON_RESOURCE_PATTERN.test(value)?value:'';
}
function rangerGradeLabel(row:BasicRanger){
 const grade=Number(row.grade);
 if(!Number.isSafeInteger(grade)||grade<1||grade>20)return '';
 const plus=Number(row.isTranscendentUnit)===1?'+':'';
 const hyper=Number(row.isHyperUnit)===1?'#':'';
 return `${grade}${plus}${hyper}★`;
}

export function rangerSkillIconUrl(resourcePath:unknown){
 const safe=safeIconResource(resourcePath);
 return safe?`${HANDBOOK_ORIGIN}/res/skill_icon/${encodeURIComponent(safe)}`:null;
}

export function splitSkillDescription(value:unknown){
 const text=cleanText(value,1200);
 if(!text)return {description:'',effects:[] as string[]};
 const lines=text.split('\n');
 const firstEffect=lines.findIndex((line)=>/^\s*[*＊•・]\s*/u.test(line));
 if(firstEffect<0)return {description:text.slice(0,500),effects:[] as string[]};

 const description=lines
  .slice(0,firstEffect)
  .join('\n')
  .trim()
  .slice(0,500);
 const effects:string[]=[];
 for(const line of lines.slice(firstEffect)){
  const trimmed=line.trim();
  if(!trimmed)continue;
  const bullet=trimmed.match(/^[*＊•・]\s*(.*)$/u);
  const effect=cleanText(bullet?bullet[1]:trimmed,220);
  if(!effect)continue;
  if(bullet||effects.length===0){
   if(effects.length<12)effects.push(effect);
  }else{
   const last=effects.length-1;
   effects[last]=cleanText(`${effects[last]} ${effect}`,220);
  }
 }
 return {description,effects};
}

// Only the structured chance, cooldown and range come from getSkills. Effect
// names, factors and durations come from the translated explanation, which can
// correct the source's numeric effect table. Ambiguous data stays unstructured.
export function sourceSkillDetails(skill:SkillRow,effects:string[]):SourceSkillDetails|null{
 if(!effects.length||effects.length>12)return null;
 const chance=Number(skill.probability),cooldown=Number(skill.skillDelayTime);
 if(skill.probability==null||skill.skillDelayTime==null||!Number.isFinite(chance)||chance<0||chance>1||!Number.isSafeInteger(cooldown)||cooldown<0||cooldown>180)return null;
 const percentage=Math.round(chance*100);
 if(Math.abs(chance*100-percentage)>0.001)return null;
 const children=Array.isArray(skill.subSkills)?skill.subSkills:[];
 const areas=[skill,...children].map(row=>record(row)?.range);
 const stableArea=(effects.length===1||children.length>=effects.length-1)&&areas.every(area=>area===areas[0])&&Number.isSafeInteger(areas[0])&&Number(areas[0])>0&&Number(areas[0])<=5000?Number(areas[0]):null;
 const rows=effects.map(effect=>{
  const normalized=effect.normalize('NFKC');
  const times=[...normalized.matchAll(/(\d{1,3})\s*(?:秒|seconds?|secs?|s\b|วินาที)/giu)];
  const durationSeconds=times.length===1?Number(times[0][1]):null;
  const factors=[...normalized.matchAll(/(\d{1,5}(?:,\d{3})?(?:\.\d+)?)\s*%/gu)];
  let factor:string|null=null;
  let label=effect.trim();
  if(factors.length===1){
   const amount=factors[0][1];
   const prefix=normalized.slice(0,factors[0].index);
   const suffix=normalized.slice(factors[0].index!+factors[0][0].length);
   const damage=/[×*]\s*$/u.test(prefix);
   const down=/ダウン|減少|低下|降低|ลด|decreas|reduc|\bdown\b/iu.test(suffix);
   const up=/アップ|増加|上昇|提升|提高|เพิ่ม|increas|boost|\bup\b/iu.test(normalized);
   factor=(damage?'×':down?'-':up?'+':'')+amount+'%';
   label=normalized.replace(factors[0][0],'').replace(/[×*]\s*(?=の|範囲|damage|dmg)/giu,'');
  }
  if(times.length===1)label=label.replace(/\s*[（(]\s*\d{1,3}\s*(?:秒|seconds?|secs?|s\b|วินาที)\s*[）)]/giu,'');
  label=label.replace(/^の/u,'').replace(/\s+by\s*$/iu,'').replace(/\s{2,}/gu,' ').trim();
  if(!label)label=effect.trim();
  return {effect:label.slice(0,220),area:stableArea,factor,durationSeconds};
 });
 return {probability:percentage,cooldownSeconds:cooldown,rows};
}

export function parseRangerInfoData(
 basics:unknown,
 skills:unknown,
 translations:unknown,
 unitCode:string,
 language:RangerInfoLanguage='ja',
):RangerInfo{
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 if(!validRangerInfoLanguage(language))throw new Error('invalid_language');
 if(!Array.isArray(basics)||!Array.isArray(skills))throw new Error('invalid_upstream');

 const translationRoot=record(translations);
 const unitTranslations=record(translationRoot?.[`${language}:UNIT`]);
 const skillTranslations=record(translationRoot?.[`${language}:SKILL`]);
 if(!unitTranslations||!skillTranslations)throw new Error('invalid_upstream');

 const ranger=basics.find((item)=>{
  const row=record(item);
  return row?.unitCode===unitCode;
 }) as BasicRanger|undefined;
 if(!ranger)throw new Error('ranger_missing');

 const unitNameCode=safeCatalogCode(ranger.unitNameCode)||`${unitCode}_nm`;
 const officialName=cleanText(unitTranslations[unitNameCode],160);
 if(!officialName)throw new Error('name_missing');
 const grade=rangerGradeLabel(ranger);
 const name=cleanText(grade?`${grade} ${officialName}`:officialName,180);

 const codes=[ranger.skillCode,ranger.skillCode2,ranger.skillCode3]
  .map(safeCatalogCode)
  .filter((code,index,list)=>code&&list.indexOf(code)===index)
  .slice(0,3);

 const byCode=new Map<string,SkillRow>();
 for(const item of skills){
  const row=record(item);
  const code=safeCatalogCode(row?.skillCode);
  if(code)byCode.set(code,row as SkillRow);
 }

 const result:RangerSkillInfo[]=[];
 for(const code of codes){
  const skill=byCode.get(code);
  if(!skill)continue;
  const nameCode=safeCatalogCode(skill.nameCode)||`${code}_nm`;
  const descriptionCode=safeCatalogCode(skill.descriptionCode)||`${code}_desc`;
  const ordinal=result.length+1;
  const fallbackSkillName=language==='en'?`Skill ${ordinal}`:language==='zh'?`技能 ${ordinal}`:language==='th'?`สกิล ${ordinal}`:`スキル${ordinal}`;
  const skillName=cleanText(skillTranslations[nameCode],120)||fallbackSkillName;
  const translatedDescription=cleanText(skillTranslations[descriptionCode],1200);
  const missingDescription=language==='en'
   ? 'No skill description is available from the source.'
   : language==='zh'
    ? '資料來源目前沒有提供技能說明。'
    : language==='th'
     ? 'แหล่งข้อมูลยังไม่มีคำอธิบายสกิล'
     : '取得元に説明情報が登録されていません。';
  const parts=translatedDescription
   ? splitSkillDescription(translatedDescription)
   : {description:missingDescription,effects:[] as string[]};
  const details=sourceSkillDetails(skill,parts.effects);
  result.push({
   name:skillName,
   description:parts.description,
   effects:parts.effects,
   iconUrl:rangerSkillIconUrl(skill.iconResourcePath),
   ...(details?{details}:{}),
  });
 }
 if(!result.length)throw new Error('skills_missing');

 return {unitCode,language,name,skills:result,sourceUrl:rangerDetailUrl(unitCode,language)};
}

export function buildRangerInfo(
 unitCode:string,
 basics:unknown,
 skills:unknown,
 translations:unknown,
 language:RangerInfoLanguage='ja',
):RangerInfo{
 return parseRangerInfoData(basics,skills,translations,unitCode,language);
}
