import type {Language} from '@/lib/rules';

type ProfileStat={label:string;value:string};
type SkillEffect={name:string;area:string;factor:string;duration:string;difference?:string};
type BoardCharacterProfile={stats:ProfileStat[];sourceUrl:string;sourceLabel:string;accessibleLabel:string};
type BoardSkillSourceDetails={
 title:string;
 effectLabel:string;
 probabilityLabel:string;
 probability:string;
 cooldownLabel:string;
 cooldown:string;
 areaLabel:string;
 factorLabel:string;
 durationLabel:string;
 effects:SkillEffect[];
};

const sallyUnitCode='u1631e-sally';
const sourceLocales={
 ja:{element:'属性',light:'光（Max: 2）',mineral:'ミネラル',type:'タイプ',intelligence:'知能',attackDistance:'攻撃距離',points:'点',source:'取得元',profileLabel:'蟹座サリーの元情報',detailsTitle:'元情報の効果表',effect:'効果',attackDifference:'説明文 +300% ／ 表 +400%',speedDifference:'説明文 攻撃速度−90% ／ 表 移動速度−90%',probability:'確率',cooldown:'冷却時間',area:'面積',factor:'係数',duration:'実効時間',seconds:'秒',
  effects:{attack:'攻撃力アップ',range:'攻撃射程アップ',invincibility:'敵の無敵を消す（臨時）',preventRemoval:'デバフ解除阻止',movement:'移動速度減少',damage:'ダメージ（一回）'}},
 en:{element:'Element',light:'Light (Max: 2)',mineral:'Mineral',type:'Type',intelligence:'Intelligence',attackDistance:'Attack distance',points:'pt',source:'Source',profileLabel:'Cancer Sally source details',detailsTitle:'Source effect table',effect:'Effect',attackDifference:'Description +300% · table +400%',speedDifference:'Description: attack speed −90% · table: movement speed −90%',probability:'Chance',cooldown:'Cooldown',area:'Area',factor:'Factor',duration:'Effective time',seconds:'s',
  effects:{attack:'Attack power up',range:'Attack range up',invincibility:'Remove enemy invincibility (temporary)',preventRemoval:'Prevent debuff removal',movement:'Movement speed down',damage:'Damage (once)'}},
 zh:{element:'屬性',light:'光（Max: 2）',mineral:'礦物',type:'類型',intelligence:'智慧',attackDistance:'攻擊距離',points:'點',source:'來源',profileLabel:'巨蟹座莎莉原始資料',detailsTitle:'來源效果表',effect:'效果',attackDifference:'說明 +300% · 表格 +400%',speedDifference:'說明：攻擊速度 −90% · 表格：移動速度 −90%',probability:'機率',cooldown:'冷卻時間',area:'範圍',factor:'係數',duration:'有效時間',seconds:'秒',
  effects:{attack:'攻擊力提升',range:'攻擊射程提升',invincibility:'暫時解除敵方無敵',preventRemoval:'阻止解除減益',movement:'移動速度下降',damage:'單次傷害'}},
 th:{element:'ธาตุ',light:'แสง (Max: 2)',mineral:'มิเนอรัล',type:'ประเภท',intelligence:'ปัญญา',attackDistance:'ระยะโจมตี',points:'pt',source:'แหล่งข้อมูล',profileLabel:'ข้อมูลต้นทางของ Cancer Sally',detailsTitle:'ตารางเอฟเฟกต์ต้นทาง',effect:'เอฟเฟกต์',attackDifference:'คำอธิบาย +300% · ตาราง +400%',speedDifference:'คำอธิบาย: ความเร็วโจมตี −90% · ตาราง: ความเร็วเคลื่อนที่ −90%',probability:'โอกาส',cooldown:'คูลดาวน์',area:'พื้นที่',factor:'อัตรา',duration:'ระยะเวลาที่มีผล',seconds:'วินาที',
  effects:{attack:'เพิ่มพลังโจมตี',range:'เพิ่มระยะโจมตี',invincibility:'ลบสถานะอมตะของศัตรู (ชั่วคราว)',preventRemoval:'ป้องกันการลบดีบัฟ',movement:'ลดความเร็วเคลื่อนที่',damage:'สร้างความเสียหาย (ครั้งเดียว)'}},
} satisfies Record<Language,{element:string;light:string;mineral:string;type:string;intelligence:string;attackDistance:string;points:string;source:string;profileLabel:string;detailsTitle:string;effect:string;attackDifference:string;speedDifference:string;probability:string;cooldown:string;area:string;factor:string;duration:string;seconds:string;effects:Record<'attack'|'range'|'invincibility'|'preventRemoval'|'movement'|'damage',string>}>

const sallySkills=[
 {probability:30,cooldown:9,effects:[
  {name:'attack',area:330,factor:'+400%',duration:7,difference:'attackDifference'},
  {name:'range',area:330,factor:'+20%',duration:7},
 ]},
 {probability:40,cooldown:15,effects:[
  {name:'invincibility',area:390,factor:null,duration:3},
  {name:'preventRemoval',area:390,factor:null,duration:12},
  {name:'movement',area:390,factor:'−90%',duration:12,difference:'speedDifference'},
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
  effectLabel:copy.effect,
  probabilityLabel:copy.probability,
  probability:`${skill.probability}%`,
  cooldownLabel:copy.cooldown,
  cooldown:formatSeconds(skill.cooldown),
  areaLabel:copy.area,
  factorLabel:copy.factor,
  durationLabel:copy.duration,
  effects:skill.effects.map(effect=>({
   name:copy.effects[effect.name],
   area:`${effect.area}${copy.points}`,
   factor:effect.factor||'—',
   duration:formatSeconds(effect.duration),
   difference:effect.difference?copy[effect.difference]:undefined,
  })),
 };
}
