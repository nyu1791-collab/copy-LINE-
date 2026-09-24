import type {Language} from '@/lib/rules';
import type {SourceSkillDetails} from '@/lib/ranger-info';

type EffectKey='attackPower'|'attackRange'|'removeInvincibility'|'preventDebuffRemoval'|'attackSpeedDown'|'damageOnce';
type RawRow={effect:EffectKey;area:number;factor:string|null;durationSeconds:number|null};
type RawSkill={probability:number;cooldownSeconds:number;rows:RawRow[]};
type SkillDetails={
 labels:{details:string;probability:string;cooldown:string;effect:string;area:string;factor:string;duration:string};
 probability:string;
 cooldown:string;
 rows:Array<{effect:string;area:string;factor:string;duration:string}>;
};

// Numeric rows were transcribed from the Ranger Handbook for Cancer Sally on 2026-09-24.
// Where the source table conflicts with its explanation, the explanation is authoritative:
// attack up is +300%, and the debuff is attack-speed reduction. Long prose is omitted from UI.
const verifiedSkills:RawSkill[]=[
 {probability:30,cooldownSeconds:9,rows:[
  {effect:'attackPower',area:330,factor:'+300%',durationSeconds:7},
  {effect:'attackRange',area:330,factor:'+20%',durationSeconds:7},
 ]},
 {probability:40,cooldownSeconds:15,rows:[
  {effect:'removeInvincibility',area:390,factor:null,durationSeconds:3},
  {effect:'preventDebuffRemoval',area:390,factor:null,durationSeconds:12},
  {effect:'attackSpeedDown',area:390,factor:'-90%',durationSeconds:12},
  {effect:'damageOnce',area:390,factor:'attack4000',durationSeconds:null},
 ]},
];

const detailLabels={
 ja:{details:'スキル詳細',probability:'確率',cooldown:'冷却時間',effect:'効果',area:'面積',factor:'係数',duration:'実効時間',points:'点',seconds:'秒',damageFactor:'攻撃力×4,000%'},
 en:{details:'Skill details',probability:'Chance',cooldown:'Cooldown',effect:'Effect',area:'Area',factor:'Factor',duration:'Duration',points:'pt',seconds:'s',damageFactor:'ATK × 4,000%'},
 zh:{details:'技能詳細資料',probability:'機率',cooldown:'冷卻時間',effect:'效果',area:'範圍',factor:'係數',duration:'有效時間',points:'點',seconds:'秒',damageFactor:'攻擊力×4,000%'},
 th:{details:'รายละเอียดสกิล',probability:'โอกาส',cooldown:'คูลดาวน์',effect:'เอฟเฟกต์',area:'พื้นที่',factor:'ตัวคูณ',duration:'ระยะเวลา',points:'pt',seconds:'วินาที',damageFactor:'ATK × 4,000%'},
} satisfies Record<Language,{details:string;probability:string;cooldown:string;effect:string;area:string;factor:string;duration:string;points:string;seconds:string;damageFactor:string}>;

const effectNames:Record<Language,Record<EffectKey,string>>={
 ja:{attackPower:'攻撃力アップ',attackRange:'攻撃射程アップ',removeInvincibility:'敵の無敵を消す（臨時）',preventDebuffRemoval:'デバフ解除阻止',attackSpeedDown:'攻撃速度減少',damageOnce:'ダメージ（一回）'},
 en:{attackPower:'Attack Power Up',attackRange:'Attack Range Up',removeInvincibility:'Remove Invincibility (temporary)',preventDebuffRemoval:'Prevent Debuff Removal',attackSpeedDown:'Attack Speed Down',damageOnce:'Damage (once)'},
 zh:{attackPower:'攻擊力提升',attackRange:'攻擊射程提升',removeInvincibility:'解除敵方無敵（暫時）',preventDebuffRemoval:'阻止解除減益',attackSpeedDown:'攻擊速度降低',damageOnce:'傷害（一次）'},
 th:{attackPower:'เพิ่มพลังโจมตี',attackRange:'เพิ่มระยะโจมตี',removeInvincibility:'ลบอมตะของศัตรู (ชั่วคราว)',preventDebuffRemoval:'ป้องกันการล้างดีบัฟ',attackSpeedDown:'ลดความเร็วโจมตี',damageOnce:'ความเสียหาย (ครั้งเดียว)'},
};

export function boardCharacterSkillDetails(unitCode:string,skillIndex:number,skillCount:number,effectCount:number,language:Language):SkillDetails|null{
 if(unitCode!=='u1631e-sally'||skillCount!==verifiedSkills.length)return null;
 const source=verifiedSkills[skillIndex];
 if(!source||effectCount!==source.rows.length)return null;
 const labels=detailLabels[language];
 return {
  labels,
  probability:source.probability+'%',
  cooldown:source.cooldownSeconds+labels.seconds,
  rows:source.rows.map(row=>({
   effect:effectNames[language][row.effect],
   area:row.area+labels.points,
   factor:row.factor==='attack4000'?labels.damageFactor:row.factor||'—',
   duration:row.durationSeconds===null?'—':row.durationSeconds+labels.seconds,
  })),
 };
}

export function boardSourceSkillDetails(source:SourceSkillDetails|undefined,effectCount:number,language:Language):SkillDetails|null{
 if(!source||!Array.isArray(source.rows)||source.rows.length!==effectCount||effectCount<1||effectCount>12||!Number.isInteger(source.probability)||source.probability<0||source.probability>100||!Number.isInteger(source.cooldownSeconds)||source.cooldownSeconds<0||source.cooldownSeconds>180)return null;
 const labels=detailLabels[language];
 return {
  labels,probability:source.probability+'%',cooldown:source.cooldownSeconds+labels.seconds,
  rows:source.rows.map(row=>({
   effect:row.effect,
   area:Number.isSafeInteger(row.area)&&Number(row.area)>0?row.area+labels.points:'—',
   factor:row.factor||'—',
   duration:Number.isSafeInteger(row.durationSeconds)&&Number(row.durationSeconds)>=0?row.durationSeconds+labels.seconds:'—',
  })),
 };
}
