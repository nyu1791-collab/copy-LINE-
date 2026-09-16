import {readFile,writeFile} from 'node:fs/promises';

const communityPath='app/community.tsx';
const rulesPath='lib/rules.ts';
const labelsPath='lib/labels.ts';
const activityLabelsPath='lib/activity-labels.ts';
const translatePath='app/api/translate/route.ts';
const testsPath='tests/community.test.mjs';

function replaceExactlyOnce(source,before,after,label){
 const first=source.indexOf(before);const last=source.lastIndexOf(before);
 if(first<0||first!==last)throw new Error(`${label}: expected exactly one source match`);
 return source.slice(0,first)+after+source.slice(first+before.length);
}

let rules=await readFile(rulesPath,'utf8');
rules=replaceExactlyOnce(
 rules,
 "export const languages = ['ja','en','zh','ko','th','id','vi'] as const;",
 "export const languages = ['ja','en'] as const;",
 'board languages',
);
await writeFile(rulesPath,rules,'utf8');

let labels=await readFile(labelsPath,'utf8');
labels=replaceExactlyOnce(
 labels,
 "export const localeNames={ja:'🇯🇵 日本語',en:'🇺🇸 English',zh:'🇹🇼 繁體中文',ko:'🇰🇷 한국어',th:'🇹🇭 ไทย',id:'🇮🇩 Indonesia',vi:'🇻🇳 Tiếng Việt'};",
 "export const localeNames={ja:'🇯🇵 日本語',en:'🇺🇸 English'};",
 'locale names',
);
labels=replaceExactlyOnce(
 labels,
 "mediaPicker:'写真・動画を選ぶ',mediaNote:",
 "mediaPicker:'写真・動画を選ぶ',mediaLimitHint:'ここをタップ（1投稿につき動画5本・画像10枚まで）',mediaLimitError:'1投稿につき、動画は5本・画像は10枚までです。',mediaNote:",
 'Japanese media limit labels',
);
labels=replaceExactlyOnce(
 labels,
 "mediaPicker:'Choose photo or video',mediaNote:",
 "mediaPicker:'Choose photo or video',mediaLimitHint:'Tap here (up to 5 videos and 10 images per post)',mediaLimitError:'Each post can include up to 5 videos and 10 images.',mediaNote:",
 'English media limit labels',
);
const overridesStart=labels.indexOf("const overrides:Partial<Record<Language,Partial<Labels>>>={");
const errorTextStart=labels.indexOf('export function errorText');
if(overridesStart<0||errorTextStart<0||errorTextStart<=overridesStart)throw new Error('multilingual label block: expected source markers');
labels=labels.slice(0,overridesStart)+"export function labels(lang:Language):Labels{return lang==='ja'?ja:en;}\n"+labels.slice(errorTextStart);
await writeFile(labelsPath,labels,'utf8');

const activity=await readFile(activityLabelsPath,'utf8');
if(!activity.includes("zh:{helpful:'有幫助'")||!activity.includes("vi:{helpful:'Hữu ích'"))throw new Error('activity labels: expected multilingual source');
await writeFile(activityLabelsPath,`import type {Language} from './rules';
const copy={
 ja:{helpful:'役に立った',helpers:'役に立ったを押した人',sort:'役に立った順',featured:'注目コメント',title:'動画投稿者'},
 en:{helpful:'Helpful',helpers:'People who found this helpful',sort:'Most helpful',featured:'Featured comment',title:'Video contributor'}
} satisfies Record<Language,{helpful:string;helpers:string;sort:string;featured:string;title:string}>;
export function activityLabels(lang:Language){return copy[lang];}
`,'utf8');

let translate=await readFile(translatePath,'utf8');
translate=replaceExactlyOnce(
 translate,
 "const googleLanguage:Record<Language,string>={ja:'ja',en:'en',zh:'zh-TW',ko:'ko',th:'th',id:'id',vi:'vi'};",
 "const googleLanguage:Record<Language,string>={ja:'ja',en:'en'};",
 'translation languages',
);
await writeFile(translatePath,translate,'utf8');

let source=await readFile(communityPath,'utf8');
source=replaceExactlyOnce(
 source,
 "import {contributionBadges,languages,legacyMultipartMediaBytes,maxMediaBytes,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
 "import {contributionBadges,languages,legacyMultipartMediaBytes,maxImagesPerPost,maxMediaBytes,maxVideosPerPost,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
 'media-limit import',
);
source=replaceExactlyOnce(
 source,
 "useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-Hant':lang;try{localStorage.setItem('line-rangers-language',lang);}catch{}},[lang]);",
 "useEffect(()=>{document.documentElement.lang=lang;try{localStorage.setItem('line-rangers-language',lang);}catch{}},[lang]);",
 'document language',
);
source=replaceExactlyOnce(
 source,
 "toLocaleString(lang==='zh'?'zh-TW':lang,",
 "toLocaleString(lang,",
 'post timestamp locale',
);
source=replaceExactlyOnce(
 source,
 '<span className="media-picker-hint">ここをタップ（動画は最大5本）</span>',
 '<span className="media-picker-hint">{t.mediaLimitHint}</span>',
 'media picker hint',
);
source=replaceExactlyOnce(
 source,
 "const selected=Array.from(e.currentTarget.files||[]);if(selected.length>5||selected.some(file=>!file.type.startsWith('video/')&&selected.length>1)){setFiles([]);e.currentTarget.value='';setNotice('動画は最大5本まで。画像を添付する場合は1枚までです。');return;}",
 "const selected=Array.from(e.currentTarget.files||[]);const videoCount=selected.filter(file=>file.type.startsWith('video/')).length;const imageCount=selected.filter(file=>file.type.startsWith('image/')).length;if(videoCount>maxVideosPerPost||imageCount>maxImagesPerPost||videoCount+imageCount!==selected.length){setFiles([]);e.currentTarget.value='';setNotice(t.mediaLimitError);return;}",
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
tests=replaceExactlyOnce(
 tests,
 " assert.match(communitySource,/media-picker-title/);assert.match(communitySource,/ここをタップ/);assert.match(communitySource,/multiple type=\"file\"/);assert.match(communitySource,/最大5本/);assert.match(communitySource,/新キャラに関する感想・情報/);assert.doesNotMatch(communitySource,/media-picker.*<small>/s);",
 " assert.match(communitySource,/media-picker-title/);assert.match(communitySource,/mediaLimitHint/);assert.match(communitySource,/multiple type=\"file\"/);assert.match(communitySource,/maxVideosPerPost/);assert.match(communitySource,/maxImagesPerPost/);assert.match(communitySource,/新キャラに関する感想・情報/);assert.doesNotMatch(communitySource,/media-picker.*<small>/s);",
 'legacy media composer assertion',
);
const marker="test('community board is Japanese-English only with ten-image five-video media caps'";
if(!tests.includes(marker)){
 tests+=`\n\ntest('community board is Japanese-English only with ten-image five-video media caps', () => {\n  const source = readFileSync(new URL('app/community.tsx', root), 'utf8');\n  const labelsSource = readFileSync(new URL('lib/labels.ts', root), 'utf8');\n  const activitySource = readFileSync(new URL('lib/activity-labels.ts', root), 'utf8');\n  const translationSource = readFileSync(new URL('app/api/translate/route.ts', root), 'utf8');\n  const directUpload = readFileSync(new URL('app/api/upload/route.ts', root), 'utf8');\n  const videoSession = readFileSync(new URL('app/api/upload/session/route.ts', root), 'utf8');\n  assert.deepEqual(rules.languages, ['ja','en']);\n  assert.equal(rules.maxImagesPerPost, 10);\n  assert.equal(rules.maxVideosPerPost, 5);\n  assert.match(labelsSource, /localeNames=\\{ja:'🇯🇵 日本語',en:'🇺🇸 English'\\}/);\n  assert.doesNotMatch(labelsSource, /🇹🇼|🇰🇷|🇹🇭|🇮🇩|🇻🇳/);\n  assert.doesNotMatch(activitySource, /zh:|ko:|th:|id:|vi:/);\n  assert.match(translationSource, /googleLanguage:Record<Language,string>=\\{ja:'ja',en:'en'\\}/);\n  assert.match(source, /media-picker-hint\\">\\{t\\.mediaLimitHint\\}/);\n  assert.match(labelsSource, /ここをタップ（1投稿につき動画5本・画像10枚まで）/);\n  assert.match(labelsSource, /Tap here \\(up to 5 videos and 10 images per post\\)/);\n  assert.match(source, /videoCount>maxVideosPerPost/);\n  assert.match(source, /imageCount>maxImagesPerPost/);\n  assert.match(source, /else void uploadImage\\(fileToSend,description,request,uploadBoard,group\\)/);\n  assert.match(directUpload, /groupLimit=video\\?maxVideosPerPost:maxImagesPerPost/);\n  assert.match(videoSession, /maxVideosPerPost/);\n});\n`;
 await writeFile(testsPath,tests,'utf8');
}
console.log('Community Japanese-English and media-cap patch applied safely.');
