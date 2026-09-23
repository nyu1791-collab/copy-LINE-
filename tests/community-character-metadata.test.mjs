import assert from 'node:assert/strict';
import test from 'node:test';
import {probeCharacterImage,safeCharacterImageUrl,verifiedMetadataFromCatalogs} from '../scripts/community-character-metadata.mjs';

const id='u1631e-sally';
const basics=[{unitCode:id,unitNameCode:'unit_sally',grade:8,isTranscendentUnit:1,isHyperUnit:0}];
const localized={
 'ja:UNIT':{unit_sally:'かに座 サリー'},
 'en:UNIT':{unit_sally:'Cancer Sally'},
 'zh:UNIT':{unit_sally:'巨蟹座 莎莉'},
 'th:UNIT':{unit_sally:'แซลลี่ ราศีกรกฎ'},
};

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
