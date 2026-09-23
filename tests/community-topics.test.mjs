import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../app/api/community-topics/route.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
const topics=Array.from({length:4},(_,i)=>({id:`u200${i}e-new`,name:`新キャラ${i}`,nameEn:`Ranger ${i}`,nameZh:`新角${i}`,nameTh:`นักรบ ${i}`,source:'pvp-auto',pvpRank:i===0?12:null,skillsVerified:true}));
new Function('exports','require',output)(exports,id=>{
 assert.equal(id,'@/lib/rules');
 return {confirmedCharactersForMonth:month=>month==='2026-10'?topics:[],monthJST:()=> '2026-10',validMonth:month=>/^20\d\d-(0[1-9]|1[0-2])$/.test(month)};
});

test('read-only release manifest exposes separate verified character identities and all four language names',async()=>{
 const response=await exports.GET(new Request('https://example.com/api/community-topics?month=2026-10'));
 assert.equal(response.status,200);
 const manifest=await response.json();
 assert.deepEqual(manifest.characters.map(row=>row.id),topics.map(row=>row.id));
 assert.ok(manifest.characters.every(row=>row.name&&row.nameEn&&row.nameZh&&row.nameTh&&row.skillsVerified));
 assert.equal(manifest.characters[0].pvpRank,12);
 assert.equal(manifest.characters[1].pvpRank,null);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.doesNotMatch(source,/from ['"]@\/(db|lib\/anonymous-session)|POST|DELETE|INSERT|UPDATE/i);
});

test('release manifest does not expose future months or malformed requests',async()=>{
 for(const month of ['2026-11','2026-00','abc']){
  const response=await exports.GET(new Request('https://example.com/api/community-topics?month='+month));
  assert.equal(response.status,400,month);
 }
});
