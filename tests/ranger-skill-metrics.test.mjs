import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../lib/ranger-info.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
new Function('exports','require',code)(exports,()=>{});
const {parseRangerInfoData,sourceSkillDetails}=exports;

test('a newly discovered unit gets the same compact metrics from source prose and structured skill metadata',()=>{
 const unit='u2100e-future';
 const basics=[{unitCode:unit,unitNameCode:'future_nm',grade:9,skillCode:'future_skill'}];
 const skills=[{skillCode:'future_skill',nameCode:'future_skill_nm',descriptionCode:'future_skill_desc',iconResourcePath:'future.png',probability:0.349999994,skillDelayTime:11,range:320,subSkills:[{range:320}]}];
 const translations={'ja:UNIT':{future_nm:'未来キャラ'},'ja:SKILL':{future_skill_nm:'未来スキル',future_skill_desc:'説明文は表示しない。\n*攻撃力250%アップ (8秒)\n*敵の攻撃速度45%ダウン (6秒)'}};
 const info=parseRangerInfoData(basics,skills,translations,unit);
 assert.equal(info.skills[0].description,'説明文は表示しない。');
 assert.deepEqual(info.skills[0].details,{probability:35,cooldownSeconds:11,rows:[
  {effect:'攻撃力アップ',area:320,factor:'+250%',durationSeconds:8},
  {effect:'敵の攻撃速度ダウン',area:320,factor:'-45%',durationSeconds:6},
 ]});
});

test('ambiguous or missing metrics never fabricate chance, area or factor',()=>{
 const effects=['Attack power 30% and range 20% up (7 sec)','Removes invincibility'];
 assert.equal(sourceSkillDetails({probability:undefined,skillDelayTime:9,range:330},effects),null);
 const details=sourceSkillDetails({probability:0.3,skillDelayTime:9,range:330,subSkills:[{range:390}]},effects);
 assert.equal(details.rows[0].area,null,'differing subskill ranges cannot be assigned to prose by position');
 assert.equal(details.rows[0].factor,null,'two percentages are ambiguous');
 assert.equal(details.rows[0].durationSeconds,7);
 assert.equal(details.rows[1].factor,null);
 assert.equal(details.rows[1].durationSeconds,null);
 assert.equal(sourceSkillDetails({probability:0.3,skillDelayTime:9,range:330},effects).rows[0].area,null,'a multi-effect skill without subskills has no verified per-effect area');
});
