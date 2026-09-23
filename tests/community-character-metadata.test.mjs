import assert from 'node:assert/strict';
import test from 'node:test';
import {probeCharacterImage,safeCharacterImageUrl,verifiedMetadataFromCatalogs,scanOfficialRangerReleaseNotices} from '../scripts/community-character-metadata.mjs';

const id='u1631e-sally';
const basics=[{unitCode:id,unitNameCode:'unit_sally',grade:8,isTranscendentUnit:1,isHyperUnit:0}];
const localized={
 'ja:UNIT':{unit_sally:'かに座 サリー'},
 'en:UNIT':{unit_sally:'Cancer Sally'},
 'zh:UNIT':{unit_sally:'巨蟹座 莎莉'},
 'th:UNIT':{unit_sally:'แซลลี่ ราศีกรกฎ'},
 'ja:SKILL':{skill_sally_nm:'月の力',skill_sally_desc:'説明\n* 攻撃力アップ'},
 'en:SKILL':{skill_sally_nm:'Moon power',skill_sally_desc:'Description\n* Attack boost'},
 'zh:SKILL':{skill_sally_nm:'月之力',skill_sally_desc:'說明\n* 提升攻擊'},
};

test('official skill codes, descriptions and icon metadata must agree before publication',()=>{
 const skilledBasics=[{...basics[0],skillCode:'sally_1'}];
 const skills=[{skillCode:'sally_1',nameCode:'skill_sally_nm',descriptionCode:'skill_sally_desc',iconResourcePath:'sally.png'}];
 const verified=verifiedMetadataFromCatalogs(id,skilledBasics,localized,'2026-09-23T00:00:00.000Z',skills);
 assert.equal(verified.skillsVerified,true);
 assert.equal(verified.skillCount,1);
 const missing={...localized,'zh:SKILL':{}};
 assert.equal(verifiedMetadataFromCatalogs(id,skilledBasics,missing,'2026-09-23T00:00:00.000Z',skills).skillsVerified,false);
 assert.equal(verifiedMetadataFromCatalogs(id,skilledBasics,localized,'2026-09-23T00:00:00.000Z',[{...skills[0],iconResourcePath:'../bad.png'}]).skillsVerified,false);
});

test('new topics need an exact official ID and Japanese, English, and Chinese catalog names',()=>{
 const verified=verifiedMetadataFromCatalogs(id,basics,localized,'2026-09-23T00:00:00.000Z');
 assert.equal(verified.id,id);
 assert.equal(verified.name,'かに座 サリー');
 assert.equal(verified.nameEn,'Cancer Sally');
 assert.equal(verified.nameZh,'巨蟹座 莎莉');
 assert.equal(verified.nameTh,'แซลลี่ ราศีกรกฎ');
 assert.equal(verified.stage,'e');
 assert.equal(verified.grade,8);
 assert.equal(verified.source,'rangers.lerico.net/api/getRangersBasics');
 assert.equal(verifiedMetadataFromCatalogs('u1631e-other',basics,localized),null);
 assert.equal(verifiedMetadataFromCatalogs(id,[{...basics[0],unitCode:'u1631e-other'}],localized),null);
 assert.equal(verifiedMetadataFromCatalogs(id,basics,{'ja:UNIT':localized['ja:UNIT'],'en:UNIT':localized['en:UNIT']}),null);
});

test('Thai catalog data is optional while the UI can fall back to English',()=>{
 const catalogs={...localized};delete catalogs['th:UNIT'];
 const verified=verifiedMetadataFromCatalogs(id,basics,catalogs);
 assert.equal(verified.nameTh,null);
 assert.equal(verified.nameEn,'Cancer Sally');
});

test('character images accept only the canonical HTTPS image URL',()=>{
 const url='https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png';
 assert.equal(safeCharacterImageUrl(url,id),url);
 assert.equal(safeCharacterImageUrl(url+'?cache=1',id),null);
 assert.equal(safeCharacterImageUrl('http://rangers.lerico.net/res/'+id+'/'+id+'-thum.png',id),null);
 assert.equal(safeCharacterImageUrl('https://other.example/res/'+id+'/'+id+'-thum.png',id),null);
});

test('image verification checks file signatures instead of trusting the MIME header',async()=>{
 const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
 const valid=await probeCharacterImage('https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png',async()=>new Response(png,{status:206,headers:{'content-type':'image/png'}}));
 assert.equal(valid,true);
 const html=new TextEncoder().encode('<html>not an image</html>');
 const fakeImage=await probeCharacterImage('https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png',async()=>new Response(html,{status:206,headers:{'content-type':'image/png'}}));
 assert.equal(fakeImage,false);
 const wrongType=await probeCharacterImage('https://rangers.lerico.net/res/'+id+'/'+id+'-thum.png',async()=>new Response(png,{status:206,headers:{'content-type':'text/html'}}));
 assert.equal(wrongType,false);
});

test('prior-month first-party release notices map exact name and grade to the maintenance-cycle month',async()=>{
 const registered=Date.parse('2026-10-01T00:00:00.000Z');
 const docs=[
  {id:11,registered:Date.parse('2026-10-17T00:00:00.000Z'),title:'Odds Up for 2 New Rangers!'},
  {id:10,registered:Date.parse('2026-09-30T14:00:00.000Z'),title:'New Rangers are here! Until the maintenance on 10/31'},
  {id:9,registered:Date.parse('2026-08-31T14:59:00.000Z'),title:'Older notice'},
 ];
 const body='<div>■ New Rangers are here!</div><div>After the maintenance on 9/30, until the maintenance on 10/31</div><div>8-Star Cancer Sally</div><div>8-Star Gemini Boss</div><div>8-Star Ultimate Evolved Blue Gemini Boss</div><div>Notes</div><div>8-Star Ignored Name</div>';
 const fetchImpl=async url=>{
  const parsed=new URL(url);
  const payload=parsed.pathname.endsWith('/notice')?{nextSeq:0,documents:docs}:{id:10,registered:docs[1].registered,title:docs[1].title,body};
  return new Response(JSON.stringify({result:payload}),{status:200,headers:{'content-type':'application/json'}});
 };
 const evidence=await scanOfficialRangerReleaseNotices([
  {id:'u1630e-sally',grade:8,nameEn:'Cancer Sally'},
  {id:'u1628e-boss',grade:8,nameEn:'Gemini Boss'},
  {id:'u1631e-sally',grade:9,nameEn:'Sun Cancer Sally'},
  {id:'u1629e-boss',grade:9,nameEn:'Crown Gemini Boss'},
 ],{fetchImpl,now:Date.parse('2026-10-20T00:00:00.000Z')});
 assert.deepEqual(Object.keys(evidence).sort(),['u1628e-boss','u1630e-sally']);
 assert.equal(evidence['u1630e-sally'].releaseMonth,'2026-10');
 assert.equal(evidence['u1630e-sally'].noticeId,10);
 assert.equal(evidence['u1630e-sally'].matchedName,'Cancer Sally');
});

test('an incomplete official notice scan returns no promotable evidence',async()=>{
 const fetchImpl=async()=>new Response(JSON.stringify({result:{nextSeq:123,documents:[{id:10,registered:Date.parse('2026-10-01T00:00:00.000Z'),title:'New Rangers are here!'}]}}),{status:200,headers:{'content-type':'application/json'}});
 await assert.rejects(()=>scanOfficialRangerReleaseNotices([],{fetchImpl,now:Date.parse('2026-10-20T00:00:00.000Z'),maxPages:1}),/scan_incomplete/);
});

test('ambiguous catalog matches do not generate official release evidence',async()=>{
 const registered=Date.parse('2026-10-01T00:00:00.000Z');
 const fetchImpl=async url=>{
  const parsed=new URL(url);const payload=parsed.pathname.endsWith('/notice')?{nextSeq:0,documents:[{id:10,registered,title:'New Rangers are here! Until the maintenance on 10/31'},{id:9,registered:Date.parse('2026-09-30T14:59:00.000Z'),title:'Older notice'}]}:{id:10,registered,title:'New Rangers are here! Until the maintenance on 10/31',body:'<div>New Rangers are here!</div><div>After the maintenance on 9/30, until the maintenance on 10/31</div><div>8-Star Cancer Sally</div><div>Notes</div>'};
  return new Response(JSON.stringify({result:payload}),{status:200,headers:{'content-type':'application/json'}});
 };
 const evidence=await scanOfficialRangerReleaseNotices([{id:'u1630e-sally',grade:8,nameEn:'Cancer Sally'},{id:'u1632e-sally',grade:8,nameEn:'Cancer Sally'}],{fetchImpl,now:Date.parse('2026-10-20T00:00:00.000Z')});
 assert.deepEqual(evidence,{});
});
