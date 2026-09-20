const UNIT_CODE_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
const CATALOG_CODE_PATTERN=/^[A-Za-z0-9_-]{1,120}$/;
const ICON_RESOURCE_PATTERN=/^[A-Za-z0-9._-]{1,180}$/;
const HANDBOOK_ORIGIN='https://rangers.lerico.net';

export type RangerSkillInfo={
 name:string;
 description:string;
 effects:string[];
 iconUrl:string|null;
};
export type RangerInfo={unitCode:string;name:string;skills:RangerSkillInfo[];sourceUrl:string};

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
};

export function validRangerUnitCode(value:string){return UNIT_CODE_PATTERN.test(value);}

export function rangerDetailUrl(unitCode:string){
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 return `${HANDBOOK_ORIGIN}/ja/ranger/${encodeURIComponent(unitCode)}`;
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

export function parseRangerInfoData(
 basics:unknown,
 skills:unknown,
 translations:unknown,
 unitCode:string,
):RangerInfo{
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 if(!Array.isArray(basics)||!Array.isArray(skills))throw new Error('invalid_upstream');

 const translationRoot=record(translations);
 const unitTranslations=record(translationRoot?.['ja:UNIT']);
 const skillTranslations=record(translationRoot?.['ja:SKILL']);
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
  const skillName=cleanText(skillTranslations[nameCode],120)||`スキル${ordinal}`;
  const translatedDescription=cleanText(skillTranslations[descriptionCode],1200);
  const parts=translatedDescription
   ? splitSkillDescription(translatedDescription)
   : {description:'取得元に説明情報が登録されていません。',effects:[] as string[]};
  result.push({
   name:skillName,
   description:parts.description,
   effects:parts.effects,
   iconUrl:rangerSkillIconUrl(skill.iconResourcePath),
  });
 }
 if(!result.length)throw new Error('skills_missing');

 return {unitCode,name,skills:result,sourceUrl:rangerDetailUrl(unitCode)};
}

export function buildRangerInfo(
 unitCode:string,
 basics:unknown,
 skills:unknown,
 translations:unknown,
):RangerInfo{
 return parseRangerInfoData(basics,skills,translations,unitCode);
}
