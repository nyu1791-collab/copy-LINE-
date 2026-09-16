import {readFile,writeFile} from 'node:fs/promises';

const communityPath='app/community.tsx';
const testsPath='tests/community.test.mjs';

function replaceExactlyOnce(source,before,after,label){
 const first=source.indexOf(before);const last=source.lastIndexOf(before);
 if(first<0||first!==last)throw new Error(`${label}: expected exactly one source match`);
 return source.slice(0,first)+after+source.slice(first+before.length);
}

let source=await readFile(communityPath,'utf8');
source=replaceExactlyOnce(
 source,
 "import {contributionBadges,languages,legacyMultipartMediaBytes,maxMediaBytes,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
 "import {contributionBadges,languages,legacyMultipartMediaBytes,maxImagesPerPost,maxMediaBytes,maxVideosPerPost,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
 'media-limit import',
);
source=replaceExactlyOnce(
 source,
 'ここをタップ（動画は最大5本）',
 'ここをタップ（1回の投稿につき動画は最大5本・画像は最大10枚）',
 'media picker hint',
);
source=replaceExactlyOnce(
 source,
 "const selected=Array.from(e.currentTarget.files||[]);if(selected.length>5||selected.some(file=>!file.type.startsWith('video/')&&selected.length>1)){setFiles([]);e.currentTarget.value='';setNotice('動画は最大5本まで。画像を添付する場合は1枚までです。');return;}",
 "const selected=Array.from(e.currentTarget.files||[]);const videoCount=selected.filter(file=>file.type.startsWith('video/')).length;const imageCount=selected.filter(file=>file.type.startsWith('image/')).length;if(videoCount>maxVideosPerPost||imageCount>maxImagesPerPost||videoCount+imageCount!==selected.length){setFiles([]);e.currentTarget.value='';setNotice('1回の投稿につき、動画は最大5本・画像は最大10枚までです。');return;}",
 'media picker validation',
);
source=replaceExactlyOnce(
 source,
 "}else if(index===0)void uploadImage(fileToSend,description,request,uploadBoard,group);",
 "}else void uploadImage(fileToSend,description,request,uploadBoard,group);",
 'multi-image uploader',
);
await writeFile(communityPath,source,'utf8');

let tests=await readFile(testsPath,'utf8');
const marker="test('media composer supports ten images and five videos per post'";
if(!tests.includes(marker)){
 tests+=`\n\ntest('media composer supports ten images and five videos per post', () => {\n  const source = readFileSync(new URL('app/community.tsx', root), 'utf8');\n  const rulesSource = readFileSync(new URL('lib/rules.ts', root), 'utf8');\n  const directUpload = readFileSync(new URL('app/api/upload/route.ts', root), 'utf8');\n  const videoSession = readFileSync(new URL('app/api/upload/session/route.ts', root), 'utf8');\n  assert.match(rulesSource, /maxImagesPerPost=10/);\n  assert.match(rulesSource, /maxVideosPerPost=5/);\n  assert.match(source, /1回の投稿につき動画は最大5本・画像は最大10枚/);\n  assert.match(source, /videoCount>maxVideosPerPost/);\n  assert.match(source, /imageCount>maxImagesPerPost/);\n  assert.match(source, /else void uploadImage\(fileToSend,description,request,uploadBoard,group\)/);\n  assert.match(directUpload, /groupLimit=video\?maxVideosPerPost:maxImagesPerPost/);\n  assert.match(videoSession, /maxVideosPerPost/);\n  assert.match(videoSession, /status='uploading' AND media_type LIKE 'video\/%'/);\n});\n`;
 await writeFile(testsPath,tests,'utf8');
}
console.log('Community UI media-limit patch applied safely.');
