import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
function compile(path){
 const source=readFileSync(new URL(path,root),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 new Function('exports','require',code)(exports,()=>{});
 return exports;
}

const {boundedMediaRange}=compile('lib/media-range.ts');
const MiB=1024*1024;

test('video delivery keeps the first response small but permits larger bounded browser ranges',()=>{
 const size=200*MiB;
 assert.deepEqual(boundedMediaRange(null,size,4*MiB,8*MiB),{start:0,end:4*MiB-1});
 assert.deepEqual(boundedMediaRange('bytes=0-',size,4*MiB,8*MiB),{start:0,end:8*MiB-1});
 assert.deepEqual(boundedMediaRange(`bytes=${32*MiB}-${64*MiB-1}`,size,4*MiB,8*MiB),{start:32*MiB,end:40*MiB-1});
 assert.deepEqual(boundedMediaRange(`bytes=${196*MiB}-`,size,4*MiB,8*MiB),{start:196*MiB,end:200*MiB-1});
 assert.deepEqual(boundedMediaRange('bytes=-1024',size,4*MiB,8*MiB),{start:size-1024,end:size-1});
});

test('media route keeps startup bounded but permits one full allowed explicit playback range',()=>{
 const route=readFileSync(new URL('app/api/media/route.ts',root),'utf8');
 assert.match(route,/boundedMediaRange\(rangeHeader,media\.media_size,videoInitialRangeBytes,videoRequestedRangeBytes\)/);
 assert.match(route,/videoRequestedRangeBytes=maxMediaBytes/);
 assert.match(route,/export async function HEAD\(request:Request\)/);
 assert.match(route,/'Content-Length':String\(media\.media_size\)/);
 assert.match(route,/Accept-Ranges':'bytes/);
 assert.match(route,/Content-Range/);
 assert.doesNotMatch(route,/range\.end-range\.start\+1>videoInitialRangeBytes/);
});

test('feed thumbnails warm a real frame only near the viewport',()=>{
 const thumbnail=readFileSync(new URL('../app/video-thumbnail.tsx',import.meta.url),'utf8');
 const community=readFileSync(new URL('../app/community.tsx',import.meta.url),'utf8');
 assert.match(thumbnail,/IntersectionObserver/);
 assert.match(thumbnail,/rootMargin:'160px 0px'/);
 assert.match(thumbnail,/<video/);
 assert.match(thumbnail,/\/api\/media\?id=/);
 assert.match(thumbnail,/preload="metadata"/);
 assert.match(thumbnail,/onLoadedMetadata=\{warmFirstFrame\}/);
 assert.match(thumbnail,/onLoadedData=\{\(\)=>setReady\(true\)\}/);
 assert.doesNotMatch(thumbnail,/autoPlay|controls/);
 assert.match(thumbnail,/video-placeholder/);
 assert.match(community,/<VideoThumbnail id=\{item\.id\} name=\{item\.mediaName/);
});
