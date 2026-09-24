import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('lib/board-character-skill-details.ts',root),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
new Function('exports','require',code)(exports,()=>{});
const {boardCharacterSkillDetails,boardSourceSkillDetails}=exports;

test('Cancer Sally skill details use the authoritative prose value and omit the prose block',()=>{
 const fireworks=boardCharacterSkillDetails('u1631e-sally',0,2,2,'ja');
 assert.deepEqual(fireworks.rows,[
  {effect:'攻撃力アップ',area:'330点',factor:'+300%',duration:'7秒'},
  {effect:'攻撃射程アップ',area:'330点',factor:'+20%',duration:'7秒'},
 ]);
 assert.equal(fireworks.probability,'30%');
 assert.equal(fireworks.cooldown,'9秒');

 const ambush=boardCharacterSkillDetails('u1631e-sally',1,2,4,'ja');
 assert.deepEqual(ambush.rows,[
  {effect:'敵の無敵を消す（臨時）',area:'390点',factor:'—',duration:'3秒'},
  {effect:'デバフ解除阻止',area:'390点',factor:'—',duration:'12秒'},
  {effect:'攻撃速度減少',area:'390点',factor:'-90%',duration:'12秒'},
  {effect:'ダメージ（一回）',area:'390点',factor:'攻撃力×4,000%',duration:'—'},
 ]);
 assert.equal(ambush.probability,'40%');
 assert.equal(ambush.cooldown,'15秒');
});

test('skill details are localized and fail closed for unknown or mismatched source data',()=>{
 for(const language of ['ja','en','zh','th']){
  const details=boardCharacterSkillDetails('u1631e-sally',0,2,2,language);
  assert.ok(details);
  assert.ok(details.labels.effect);
  assert.ok(details.labels.area);
  assert.ok(details.labels.factor);
  assert.ok(details.labels.duration);
  assert.ok(details.labels.probability);
  assert.ok(details.labels.cooldown);
  assert.ok(details.rows[0].effect);
 }
 assert.equal(boardCharacterSkillDetails('u9999e-ranger',0,2,2,'ja'),null);
 assert.equal(boardCharacterSkillDetails('u1631e-sally',0,3,2,'ja'),null);
 assert.equal(boardCharacterSkillDetails('u1631e-sally',0,2,1,'ja'),null);
 assert.equal(boardCharacterSkillDetails('u1631e-sally',2,2,2,'ja'),null);
});

test('new characters use structured source chance, cooldown, area and prose effects in every language',()=>{
 const source={probability:35,cooldownSeconds:11,rows:[
  {effect:'攻撃力アップ',area:320,factor:'+250%',durationSeconds:8},
  {effect:'攻撃速度ダウン',area:320,factor:'-45%',durationSeconds:6},
 ]};
 for(const language of ['ja','en','zh','th']){
  const details=boardSourceSkillDetails(source,2,language);
  assert.equal(details.probability,'35%');
  assert.equal(details.rows[0].factor,'+250%');
  assert.equal(details.rows[1].factor,'-45%');
  assert.ok(details.rows[0].area.startsWith('320'));
  assert.ok(details.rows[0].duration.startsWith('8'));
 }
 assert.equal(boardSourceSkillDetails(source,1,'ja'),null);
});

test('the board renders source metrics without the duplicate prose block or a wide HTML table',()=>{
 const component=readFileSync(new URL('app/board-character-skills.tsx',root),'utf8');
 const css=readFileSync(new URL('app/community.css',root),'utf8');
 assert.match(component,/boardCharacterSkillDetails\(unitCode,index,info\.skills\.length,skill\.effects\.length,language\)\|\|boardSourceSkillDetails\(skill\.details/);
 assert.match(component,/className="board-skill-detail-table" role="table"/);
 assert.match(component,/role="columnheader"/);
 assert.doesNotMatch(component,/skill\.description/);
 assert.doesNotMatch(component,/<table/);
 assert.match(css,/\.board-skill-detail-row\{display:grid/);
 assert.match(css,/\.board-skill-detail-meta/);
 assert.match(css,/@media\(max-width:360px\)\{\.board-skill-detail-row/);
 assert.doesNotMatch(css,/#e5c987/);
});
