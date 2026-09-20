const UNIT_CODE_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
const HANDBOOK_ORIGIN='https://rangers.lerico.net';

export type RangerSkillInfo={name:string;description:string};
export type RangerInfo={unitCode:string;name:string;skills:RangerSkillInfo[];sourceUrl:string};

type RangerBasic={
 unitCode?:unknown;
 unitNameCode?:unknown;
 skillCode?:unknown;
 skillCode2?:unknown;
 skillCode3?:unknown;
};
type SkillRow={
 skillCode?:unknown;
 nameCode?:unknown;
 descriptionCode?:unknown;
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
  .replace(/\r/g,'')
  .replace(/[ \t]+/g,' ')
  .replace(/ *\n */g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim()
  .slice(0,max);
}
function safeCode(value:unknown){
 return typeof value==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(value)?value:'';
}
function record(value:unknown):Record<string,unknown>|null{
 return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

export function buildRangerInfo(unitCode:string,basicsPayload:unknown,skillsPayload:unknown,translationsPayload:unknown):RangerInfo{
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 if(!Array.isArray(basicsPayload)||!Array.isArray(skillsPayload))throw new Error('invalid_catalog');

 const basic=basicsPayload.find((row:unknown)=>record(row)?.unitCode===unitCode) as RangerBasic|undefined;
 if(!basic)throw new Error('unit_not_found');

 const translations=record(translationsPayload);
 const unitTranslations=record(translations?.['ja:UNIT']);
 const skillTranslations=record(translations?.['ja:SKILL']);
 if(!unitTranslations||!skillTranslations)throw new Error('translation_missing');

 const unitNameCode=safeCode(basic.unitNameCode)||`${unitCode}_nm`;
 const name=cleanText(unitTranslations[unitNameCode]??unitTranslations[`${unitCode}_nm`],180);
 if(!name)throw new Error('unit_name_missing');

 const rows=new Map<string,SkillRow>();
 for(const row of skillsPayload){
  const value=record(row);const code=safeCode(value?.skillCode);
  if(code)rows.set(code,value as SkillRow);
 }
 const codes=[basic.skillCode,basic.skillCode2,basic.skillCode3]
  .map(safeCode)
  .filter((code,index,list)=>code&&list.indexOf(code)===index);

 const skills:RangerSkillInfo[]=[];
 for(const code of codes){
  const row=rows.get(code);
  const nameCode=safeCode(row?.nameCode)||`${code}_nm`;
  const descriptionCode=safeCode(row?.descriptionCode)||`${code}_desc`;
  const skillName=cleanText(skillTranslations[nameCode],120);
  const description=cleanText(skillTranslations[descriptionCode],500);
  if(!skillName)continue;
  skills.push({name:skillName,description});
  if(skills.length>=3)break;
 }
 if(!skills.length)throw new Error('skills_missing');

 return {unitCode,name,skills,sourceUrl:rangerDetailUrl(unitCode)};
}
