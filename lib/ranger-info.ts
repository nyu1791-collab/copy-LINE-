const UNIT_CODE_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
const HANDBOOK_ORIGIN='https://rangers.lerico.net';

export type RangerSkillInfo={name:string;description:string};
export type RangerInfo={unitCode:string;name:string;skills:RangerSkillInfo[];sourceUrl:string};

export function validRangerUnitCode(value:string){return UNIT_CODE_PATTERN.test(value);}

export function rangerDetailUrl(unitCode:string){
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 return `${HANDBOOK_ORIGIN}/ja/ranger/${encodeURIComponent(unitCode)}`;
}

function decodeEntities(value:string){
 const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 return value
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(full,entity:string)=>{
   const lower=entity.toLowerCase();
   if(lower.startsWith('#x')){const code=Number.parseInt(lower.slice(2),16);return Number.isFinite(code)&&code>=0&&code<=0x10ffff?String.fromCodePoint(code):full;}
   if(lower.startsWith('#')){const code=Number.parseInt(lower.slice(1),10);return Number.isFinite(code)?String.fromCodePoint(code):full;}
   return named[lower]??full;
  });
}
function cleanHtmlText(value:string){
 return decodeEntities(value
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<br\s*\/?\s*>/gi,'\n')
  .replace(/<[^>]+>/g,' '))
  .replace(/[\t\r ]+/g,' ')
  .replace(/ *\n */g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
}
function firstParagraph(fragment:string){
 const paragraphs=[...fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map(match=>cleanHtmlText(match[1]))
  .filter(text=>text&&text!=='詳細を表示'&&text!=='Show Details');
 return paragraphs[0]||'';
}

export function parseRangerInfoHtml(html:string,unitCode:string):RangerInfo{
 if(!validRangerUnitCode(unitCode))throw new Error('invalid_unit_code');
 const sourceUrl=rangerDetailUrl(unitCode);
 const withoutNoise=html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const headingPattern=/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
 const headings:{level:number;text:string;start:number;end:number}[]=[];
 let match:RegExpExecArray|null;
 while((match=headingPattern.exec(withoutNoise))){
  const text=cleanHtmlText(match[2]);
  if(text)headings.push({level:Number(match[1]),text,start:match.index,end:headingPattern.lastIndex});
 }
 const title=headings.find(item=>item.level===1)?.text||'';
 const skillSectionIndex=headings.findIndex(item=>item.text==='スキル'||item.text==='Skill');
 if(skillSectionIndex<0)return {unitCode,name:title,skills:[],sourceUrl};
 const skillSection=headings[skillSectionIndex];
 const nextSection=headings.find((item,index)=>index>skillSectionIndex&&(item.text==='アビリティ'||item.text==='Ability'||item.text==='進化'||item.text==='Evolution'));
 const sectionEnd=nextSection?.start??withoutNoise.length;
 const candidates=headings.filter(item=>item.start>=skillSection.end&&item.start<sectionEnd&&item.level>=4&&item.text!=='詳細を表示'&&item.text!=='Show Details');
 const skills:RangerSkillInfo[]=[];
 const seen=new Set<string>();
 for(let index=0;index<candidates.length&&skills.length<3;index++){
  const item=candidates[index];
  const name=item.text.slice(0,120).trim();
  if(!name||seen.has(name))continue;
  seen.add(name);
  const next=candidates[index+1];
  const fragment=withoutNoise.slice(item.end,Math.min(next?.start??sectionEnd,sectionEnd));
  const description=firstParagraph(fragment).slice(0,500);
  skills.push({name,description});
 }
 return {unitCode,name:title.slice(0,180),skills,sourceUrl};
}
