import type {Language} from '@/lib/rules';

type ProfileStat={label:string;value:string};
type BoardCharacterProfile={stats:ProfileStat[];sourceUrl:string;sourceLabel:string;accessibleLabel:string};

const sallyUnitCode='u1631e-sally';
const sourceLocales={
 ja:{element:'属性',light:'光（Max: 2）',mineral:'ミネラル',type:'タイプ',intelligence:'知能',attackDistance:'攻撃距離',points:'点',source:'取得元',profileLabel:'蟹座サリーの元情報'},
 en:{element:'Element',light:'Light (Max: 2)',mineral:'Mineral',type:'Type',intelligence:'Intelligence',attackDistance:'Attack distance',points:'pt',source:'Source',profileLabel:'Cancer Sally source details'},
 zh:{element:'屬性',light:'光（Max: 2）',mineral:'礦物',type:'類型',intelligence:'智慧',attackDistance:'攻擊距離',points:'點',source:'來源',profileLabel:'巨蟹座莎莉原始資料'},
 th:{element:'ธาตุ',light:'แสง (Max: 2)',mineral:'มิเนอรัล',type:'ประเภท',intelligence:'ปัญญา',attackDistance:'ระยะโจมตี',points:'pt',source:'แหล่งข้อมูล',profileLabel:'ข้อมูลต้นทางของ Cancer Sally'},
} satisfies Record<Language,{element:string;light:string;mineral:string;type:string;intelligence:string;attackDistance:string;points:string;source:string;profileLabel:string}>

export function boardCharacterSourceProfile(unitCode:string,language:Language):BoardCharacterProfile|null{
 if(unitCode!==sallyUnitCode)return null;
 const copy=sourceLocales[language];
 return {
  stats:[
   {label:copy.element,value:copy.light},
   {label:copy.mineral,value:'1710'},
   {label:copy.type,value:copy.intelligence},
   {label:copy.attackDistance,value:`580${copy.points}`},
  ],
  sourceUrl:`https://rangers.lerico.net/${language==='th'?'en':language}/ranger/${encodeURIComponent(unitCode)}`,
  sourceLabel:copy.source,
  accessibleLabel:copy.profileLabel,
 };
}
