import type {Language} from '@/lib/rules';

type ProfileStat={label:string;value:string};
type SkillEffect={name:string;area:string;factor:string;duration:string};
type BoardCharacterProfile={stats:ProfileStat[];sourceUrl:string;sourceLabel:string;accessibleLabel:string};
type BoardSkillSourceDetails={
 title:string;
 note:string;
 probabilityLabel:string;
 probability:string;
 cooldownLabel:string;
 cooldown:string;
 areaLabel:string;
 factorLabel:string;
 durationLabel:string;
 descriptionEffectsLabel:string;
 effects:SkillEffect[];
};

const sallyUnitCode='u1631e-sally';
const sourceLocales={
 ja:{element:'属性',light:'光（Max: 2）',mineral:'ミネラル',type:'タイプ',intelligence:'知能',attackDistance:'攻撃距離',points:'点',source:'取得元',profileLabel:'蟹座サリーの元情報',detailsTitle:'効果詳細（元情報の表）',detailsNote:'下記は取得元の効果表です。説明文に異なる数値が記載されている場合は、両方を分けて表示します。',probability:'確率',cooldown:'冷却時間',area:'面積',factor:'係数',duration:'実効時間',descriptionEffects:'説明文に記載の効果',seconds:'秒',
  effects:{attack:'攻撃力アップ',range:'攻撃射程アップ',invincibility:'敵の無敵を消す（臨時）',preventRemoval:'デバフ解除阻止',movement:'移動速度減少',damage:'ダメージ（一回）'}},
 en:{element:'Element',light:'Light (Max: 2)',mineral:'Mineral',type:'Type',intelligence:'Intelligence',attackDistance:'Attack distance',points:'pt',source:'Source',profileLabel:'Cancer Sally source details',detailsTitle:'Effect details (source table)',detailsNote:'Values below are transcribed from the source effect table. Any different values in the prose are shown separately.',probability:'Chance',cooldown:'Cooldown',area:'Area',factor:'Factor',duration:'Effective time',descriptionEffects:'Effects listed in description',seconds:'s',
  effects:{attack:'Attack power up',range:'Attack range up',invincibility:'Remove enemy invincibility (temporary)',preventRemoval:'Prevent debuff removal',movement:'Movement speed down',damage:'Damage (once)'}},
 zh:{element:'屬性',light:'光（Max: 2）',mineral:'礦物',type:'類型',intelligence:'智慧',attackDistance:'攻擊距離',points:'點',source:'來源',profileLabel:'巨蟹座莎莉原始資料',detailsTitle:'效果詳情（來源表格）',detailsNote:'以下數值照錄來源效果表；說明文字中的不同數值會分開顯示。',probability:'機率',cooldown:'冷卻時間',area:'範圍',factor:'係數',duration:'有效時間',descriptionEffects:'說明文字中的效果',seconds:'秒',
  effects:{attack:'攻擊力提升',range:'攻擊射程提升',invincibility:'暫時解除敵方無敵',preventRemoval:'阻止解除減益',movement:'移動速度下降',damage:'單次傷害'}},
 th:{element:'ธาตุ',light:'แสง (Max: 2)',mineral:'มิเนอรัล',type:'ประเภท',intelligence:'ปัญญา',attackDistance:'ระยะโจมตี',points:'pt',source:'แหล่งข้อมูล',profileLabel:'ข้อมูลต้นทางของ Cancer Sally',detailsTitle:'รายละเอียดเอฟเฟกต์ (ตารางต้นทาง)',detailsNote:'ตัวเลขด้านล่างถอดตามตารางเอฟเฟกต์ต้นทาง หากคำอธิบายระบุตัวเลขต่างกัน จะแสดงแยกไว้',probability:'โอกาส',cooldown:'คูลดาวน์',area:'พื้นที่',factor:'อัตรา',duration:'ระยะเวลาที่มีผล',descriptionEffects:'เอฟเฟกต์ในคำอธิบาย',seconds:'วินาที',
  effects:{attack:'เพิ่มพลังโจมตี',range:'เพิ่มระยะโจมตี',invincibility:'ลบสถานะอมตะของศัตรู (ชั่วคราว)',preventRemoval:'ป้องกันการลบดีบัฟ',movement:'ลดความเร็วเคลื่อนที่',damage:'สร้างความเสียหาย (ครั้งเดียว)'}},
} satisfies Record<Language,{element:string;light:string;mineral:string;type:string;intelligence:string;attackDistance:string;points:string;source:string;profileLabel:string;detailsTitle:string;detailsNote:string;probability:string;cooldown:string;area:string;factor:string;duration:string;descriptionEffects:string;seconds:string;effects:Record<'attack'|'range'|'invincibility'|'preventRemoval'|'movement'|'damage',string>}>

const sallySkills=[
 {probability:30,cooldown:9,effects:[
  {name:'attack',area:330,factor:'+400%',duration:7},
  {name:'range',area:330,factor:'+20%',duration:7},
 ]},
 {probability:40,cooldown:15,effects:[
  {name:'invincibility',area:390,factor:null,duration:3},
  {name:'preventRemoval',area:390,factor:null,duration:12},
  {name:'movement',area:390,factor:'−90%',duration:12},
  {name:'damage',area:390,factor:'ATK × 4,000%',duration:null},
 ]},
] as const;

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

export function boardSkillSourceDetails(unitCode:string,skillIndex:number,language:Language):BoardSkillSourceDetails|null{
 if(unitCode!==sallyUnitCode||!Number.isInteger(skillIndex)||skillIndex<0||skillIndex>=sallySkills.length)return null;
 const copy=sourceLocales[language];
 const skill=sallySkills[skillIndex];
 const formatSeconds=(value:number|null)=>value===null?'—':`${value}${copy.seconds}`;
 return {
  title:copy.detailsTitle,
  note:copy.detailsNote,
  probabilityLabel:copy.probability,
  probability:`${skill.probability}%`,
  cooldownLabel:copy.cooldown,
  cooldown:formatSeconds(skill.cooldown),
  areaLabel:copy.area,
  factorLabel:copy.factor,
  durationLabel:copy.duration,
  descriptionEffectsLabel:copy.descriptionEffects,
  effects:skill.effects.map(effect=>({
   name:copy.effects[effect.name],
   area:`${effect.area}${copy.points}`,
   factor:effect.factor||'—',
   duration:formatSeconds(effect.duration),
  })),
 };
}
