import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {AsyncLocalStorage} from 'node:async_hooks';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
function compile(path,require){const source=readFileSync(new URL(path,root),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('exports','require',code)(exports,require);return exports;}
const rules=compile('lib/rules.ts',()=>{});
const rangerInfo=compile('lib/ranger-info.ts',()=>{});
const rangerRouteSource=readFileSync(new URL('app/api/ranger-info/route.ts',root),'utf8');
const {mediaRange}=compile('lib/media-range.ts',()=>{});
const communitySource=readFileSync(new URL('app/community.tsx',root),'utf8');
const communityCss=readFileSync(new URL('app/community.css',root),'utf8');
const pageSource=readFileSync(new URL('app/page.tsx',root),'utf8');
const lazyImageSource=readFileSync(new URL('app/lazy-image.tsx',root),'utf8');
const videoPlayerSource=readFileSync(new URL('app/video-player.tsx',root),'utf8');
const videoThumbnailSource=readFileSync(new URL('app/video-thumbnail.tsx',root),'utf8');
const activitySource=readFileSync(new URL('lib/community-activity.ts',root),'utf8');
const uploadSessionSource=readFileSync(new URL('lib/upload-session.ts',root),'utf8');
const labelsSource=readFileSync(new URL('lib/labels.ts',root),'utf8');
const layoutSource=readFileSync(new URL('app/layout.tsx',root),'utf8');
test('public board has no review-only chrome and is indexable',()=>{
 assert.doesNotMatch(communitySource,/review-tag/);
 assert.match(communitySource,/footer/);
 assert.doesNotMatch(layoutSource,/index:\s*false|確認版|非公開・評価用|Development review/);
 assert.match(layoutSource,/index:\s*true/);
 assert.match(labelsSource,/ja\.evaluation='LINE Rangers ファンコミュニティ'/);
 assert.match(labelsSource,/en\.evaluation='LINE Rangers fan community'/);
});
test('media byte ranges support suffixes and reject malformed requests',()=>{
 assert.deepEqual(mediaRange('bytes=-3',10),{start:7,end:9});
 assert.deepEqual(mediaRange('bytes=3-',10),{start:3,end:9});
 assert.deepEqual(mediaRange('bytes=0-99',10),{start:0,end:9});
 assert.deepEqual(mediaRange('bytes=-99',10),{start:0,end:9});
 assert.equal(mediaRange(null,10),null);
 for(const range of ['bytes=-','bytes=-0','bytes=10-','bytes=4-3','bytes=0-1,3-4','bytes=0-999999999999999999999'])assert.throws(()=>mediaRange(range,10));
});
test('comment UI keeps reactions private, opens replies on demand, and marks a selected reply target',()=>{
 assert.doesNotMatch(communitySource,/openReactors|setLikers|translate\.google\.com/);
 assert.match(communitySource,/replyTarget/);assert.match(communitySource,/toggleReplies/);assert.match(communitySource,/t\.showReplies\.replace/);assert.doesNotMatch(communitySource,/translatePost|<Languages/);assert.match(communitySource,/replyingTo/);assert.match(communitySource,/parent\?:string\|null/);assert.match(communitySource,/function canReplyToPost/);assert.match(communitySource,/function canReplyToPost\(post:Post,isReply:boolean,parent:Post\|null=null\)/);assert.match(communitySource,/const replyEnabled=canReplyToPost\(p,isReply,parent\)/);assert.match(communitySource,/postCard\(reply,false,true,p\)/);assert.match(communitySource,/replyEnabled&&/);assert.match(communitySource,/post-meta.*badges\.map/s);assert.match(communitySource,/data-badge=\{badge\}/);assert.match(communitySource,/post-author-line/);assert.match(communitySource,/contribution-title/);assert.match(communitySource,/post-badge-mark/);assert.match(communitySource,/data-badge=\{badge\}/);assert.match(communityCss,/\.post-badge-mark/);
 assert.match(communitySource,/media-picker-title/);assert.match(communitySource,/mediaLimitHint/);assert.match(communitySource,/multiple type="file"/);assert.match(communitySource,/maxVideosPerPost/);assert.match(communitySource,/maxImagesPerPost/);assert.match(communitySource,/t\.newCharacterNote/);assert.doesNotMatch(communitySource,/media-picker.*<small>/s);
 assert.match(communitySource,/mine/);assert.match(communitySource,/composer-reply/);assert.match(communitySource,/t\.replyTargetLabel/);assert.match(communitySource,/t\.badgeManagementTitle/);assert.match(communitySource,/t\.videoContributor/);assert.match(communitySource,/t\.helpfulContributor/);assert.match(communitySource,/ownerDisplayName/);assert.doesNotMatch(communitySource,/運営バッジ/);assert.match(communitySource,/data\?\.me\?\.role==='owner'/);
 assert.match(communitySource,/line-rangers-display-name/);assert.match(communitySource,/function uiName/);assert.match(communitySource,/匿名ユーザー/);assert.match(communitySource,/uiName\(replyTarget\.name,t\.anonymousUser\)/);assert.match(communitySource,/profileRestoreSubject/);assert.match(communitySource,/profileRestoreInFlight/);assert.doesNotMatch(communitySource,/profileRestoreAttempted/);assert.match(communitySource,/t\.ownerAccess/);assert.match(labelsSource,/ownerAccessDescription/);assert.match(communitySource,/one-time-code/);
 assert.match(communitySource,/\.\.\.\(p\.mine\?\[\]:\['delete'\]\)/);assert.ok(communitySource.indexOf('<p className="post-body">')<communitySource.indexOf('{detail&&videoItems.length>0'));
 assert.doesNotMatch(communitySource,/value=\{month\}.*onChange/);
 assert.match(communitySource,/VideoThumbnail id=\{item\.id\}/);assert.match(videoThumbnailSource,/<video/);assert.match(videoThumbnailSource,/\/api\/media/);assert.match(videoThumbnailSource,/IntersectionObserver/);assert.match(videoThumbnailSource,/preload="metadata"/);assert.doesNotMatch(videoThumbnailSource,/autoPlay/);assert.match(videoThumbnailSource,/labels\(lang\)/);assert.match(videoThumbnailSource,/t\.playVideo/);assert.match(videoPlayerSource,/labels\(lang\)/);assert.match(videoPlayerSource,/t\.videoUnavailable/);assert.match(labelsSource,/playVideo:'Tap to play'/);assert.match(labelsSource,/videoUnavailable:'The video is currently unavailable/);assert.match(videoPlayerSource,/onLoadedData/);assert.match(videoPlayerSource,/onError=\{reportFailure\}/);
 assert.match(communityCss,/\.composer\.composer-reply\{position:fixed!important/);assert.match(communityCss,/\.role-owner/);assert.match(communityCss,/border:0!important/);assert.doesNotMatch(pageSource,/\/boards(?:\?|["'])/);assert.doesNotMatch(pageSource,/line-rangers-fan\.github\.io\/line-rangers-pvp/);assert.doesNotMatch(communitySource,/entry-actions|ranking-link|line-rangers-fan\.github\.io\/line-rangers-pvp/);assert.doesNotMatch(communitySource,/raw\.githubusercontent\.com\/line-rangers-fan\/line-rangers-pvp/);
});
test('comment draft is cleared only after the server confirms the post',()=>{
 const publish=communitySource.slice(communitySource.indexOf('async function publish()'));
 const request=publish.indexOf('await boardRequest');
 const clear=publish.indexOf("if(bodyRef.current.trim()===content)setDraft('')");
 assert.ok(request>=0&&clear>request,'successful draft clear must follow the awaited server request');
 assert.doesNotMatch(publish.slice(0,request),/setDraft\(''\)/,'failed or pending posts must retain the draft');
});
test('video contributor badges are manual only',()=>{
 assert.doesNotMatch(activitySource,/videoAuthors|video_contributor/);
 assert.doesNotMatch(communitySource,/title:'video_contributor'/);
});
test('selected reactions use distinct pink and blue states',()=>{
 assert.match(communitySource,/className=\{p\.liked\?'is-liked':''\}/);
 assert.match(communitySource,/fill=\{p\.liked\?'currentColor':'none'\}/);
 assert.match(communitySource,/className=\{p\.helped\?'is-helpful':''\}/);
 assert.match(communitySource,/fill=\{p\.helped\?'currentColor':'none'\}/);
 assert.match(communityCss,/\.post-actions \.is-liked\{color:#f472b6!important\}/);
 assert.match(communityCss,/\.post-actions \.is-helpful\{color:#60a5fa!important\}/);assert.match(communityCss,/\.video-carousel\{display:flex/);
});
test('interaction UI uses local updates, resumable uploads, and does not reload the board after each action',()=>{
 assert.doesNotMatch(communitySource,/window\.location\.reload|await\s+reload\s*\(/);
 for(const feature of ['toggleLike','toggleHelpful','chooseVote','rollbackLocalPost','resumeForReselectedFile'])assert.match(communitySource,new RegExp(feature));
 assert.doesNotMatch(communitySource,/const \[loading,/);assert.match(communitySource,/initialLoading/);assert.doesNotMatch(communitySource,/translationVersions/);
 assert.match(videoPlayerSource,/preload="metadata"/);assert.doesNotMatch(videoPlayerSource,/preload="auto"/);assert.match(videoPlayerSource,/onLoadedData/);assert.match(videoPlayerSource,/onError={reportFailure}/);
 assert.match(lazyImageSource,/IntersectionObserver/);
});
test('new-character switching requires an explicitly confirmed month and identity',()=>{
 assert.deepEqual(rules.confirmedCharactersForMonth('2026-09').map(character=>character.id),['u1631e-sally']);
 assert.deepEqual(rules.confirmedCharactersForMonth('2026-10'),[]);
 assert.equal(rules.isConfirmedCharacterForMonth('u1631e-sally','2026-09'),true);
 assert.equal(rules.isConfirmedCharacterForMonth('u1631e-sally','2026-10'),false);
 assert.equal(rules.isKnownCharacter('unverified-character'),false);
});
test('abandoned multipart sessions expire after a bounded lifetime',()=>{
 const upload=compile('lib/upload-session.ts',id=>{
  if(id==='@/db/raw')return {};
  if(id==='@/lib/rules')return rules;
  if(id==='@/lib/anonymous-session')return {};
  throw new Error('Unexpected upload-session import '+id);
 });
 assert.equal(upload.uploadSessionExpired({created:1000},1000+24*60*60*1000),false);
 assert.equal(upload.uploadSessionExpired({created:1000},1001+24*60*60*1000),true);
 assert.equal(upload.uploadSessionExpired({created:Number.NaN},1000),true);
 assert.match(uploadSessionSource,/uploadSessionMaxAgeMs/);
});
function setup(){
 const deletedObjects=[];const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(readFileSync(new URL('drizzle/0000_clumsy_penance.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0001_talented_gabe_jones.sql',root),'utf8'));
 const db={prepare(query){let args=[];return {bind(...a){args=a;return this;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};},async batch(statements){sql.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 sql.exec(readFileSync(new URL('drizzle/0002_true_purifiers.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0003_thankful_firestar.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0004_yummy_warbird.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0005_bumpy_hellcat.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0006_quick_zuras.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0007_overjoyed_scorpion.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0008_free_phalanx.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0009_horizontal_media_groups.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0010_media_cleanup_queue.sql',root),'utf8'));sql.exec(readFileSync(new URL('drizzle/0012_character_name_en.sql',root),'utf8'));
 const activity=compile('lib/community-activity.ts',()=>({database:()=>db}));
 const featureTypes=compile('lib/community-features.ts',()=>{});
 const flags=compile('lib/community-flags.ts',id=>{
  if(id==='@/db/raw')return {database:()=>db,bucket:()=>({async delete(keys){deletedObjects.push(...(Array.isArray(keys)?keys:[keys]));}})};
  if(id==='@/lib/community-features')return featureTypes;
  throw new Error('Unexpected flag import '+id);
 });
 const requestContext=new AsyncLocalStorage();
 const anonymous=compile('lib/anonymous-session.ts',id=>{
  if(id==='cloudflare:workers')return {env:{BOARD_ANON_COOKIE_SECRET:'test-anon-cookie-secret-0123456789012345',BOARD_OWNER_SUBJECT:'owner-subject',BOARD_OWNER_ACCESS_TOKEN:'test-owner-access-token',BOARD_TRUST_UPSTREAM_AUTH:'test'}};
  if(id==='@/lib/rules')return rules;
  throw new Error('Unexpected anonymous import '+id);
 });
 const api=compile('app/api/board/route.ts',id=>{
  if(id==='next/headers')return {headers:async()=>requestContext.getStore().headers};
  if(id==='cloudflare:workers')return {env:{BOARD_OWNER_EMAIL:'owner@example.invalid',BOARD_OWNER_SUBJECT:'owner-subject',BOARD_OWNER_ACCESS_TOKEN:'test-owner-access-token',BOARD_ANON_COOKIE_SECRET:'test-anon-cookie-secret-0123456789012345',BOARD_TRUST_UPSTREAM_AUTH:'test'}};
  if(id==='@/db/raw')return {database:()=>db,bucket:()=>({async delete(keys){deletedObjects.push(...(Array.isArray(keys)?keys:[keys]));}})};
  if(id==='@/lib/rules')return rules;
  if(id==='@/lib/community-activity')return activity;
  if(id==='@/lib/community-flags')return flags;
  if(id==='@/lib/community-features')return featureTypes;
 if(id==='@/lib/anonymous-session')return anonymous;
 throw new Error('Unexpected import '+id);
 });
 const activityApi=compile('app/api/activity/route.ts',id=>{
  if(id==='next/headers')return {headers:async()=>requestContext.getStore().headers};
  if(id==='@/db/raw')return {database:()=>db,bucket:()=>({async delete(keys){deletedObjects.push(...(Array.isArray(keys)?keys:[keys]));}})};
  if(id==='@/lib/community-activity')return activity;
  if(id==='@/lib/rules')return rules;
  if(id==='@/lib/anonymous-session')return anonymous;
  throw new Error('Unexpected activity import '+id);
 });
 const call=async(body=null,who='test-a',path='',email='test@example.invalid',origin='https://review.example',cookie='')=>{
  const request=new Request('https://review.example/api/board'+path,{method:body?'POST':'GET',headers:{host:'review.example',...(who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':email}:{}),...(cookie?{cookie}:{}),origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return requestContext.run(request,async()=>{const r=await (body?api.POST(request):api.GET(request));return {status:r.status,data:await r.json(),headers:r.headers};});};
 const activityCall=async(who='test-a',cookie='')=>{
  const request=new Request('https://review.example/api/activity',{headers:{host:'review.example',...(who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':'test@example.invalid'}:{}),...(cookie?{cookie}:{}),origin:'https://review.example'}});
  return requestContext.run(request,async()=>{const r=await activityApi.GET(request);return {status:r.status,data:await r.json(),headers:r.headers};});
 };
 const publicActivityCall=async(viewerToken='')=>{
  const request=new Request('https://review.example/api/activity?public=1',{headers:{host:'review.example',origin:'https://line-rangers-fan.github.io',...(viewerToken?{'x-lr-viewer':viewerToken}:{})}});
  return requestContext.run(request,async()=>{const r=await activityApi.GET(request);return {status:r.status,data:await r.json(),headers:r.headers};});
 };
 return {sql,call,activityCall,publicActivityCall,anonymous,deletedObjects,clearLimits(){sql.exec('DELETE FROM limits');}};
}
test('JST month boundaries and leap/year transitions',()=>{
 assert.equal(rules.monthJST(new Date('2026-09-30T14:59:59Z')),'2026-09');assert.equal(rules.monthJST(new Date('2026-09-30T15:00:00Z')),'2026-10');assert.equal(rules.monthJST(new Date('2026-12-31T15:00:00Z')),'2027-01');assert.equal(rules.monthJST(new Date('2028-02-29T15:00:00Z')),'2028-03');assert.equal(rules.validMonth('2026-13'),false);
});
test('media types are explicitly allowlisted and video type is preserved',()=>{
 assert.equal(rules.mediaExtension('image/jpeg'),'jpg');assert.equal(rules.mediaExtension('video/mp4'),'mp4');assert.equal(rules.mediaExtension('image/svg+xml'),null);assert.equal(rules.isVideoMedia('video/quicktime'),true);assert.equal(rules.isVideoMedia('image/png'),false);
 assert.equal(rules.maxMediaBytes,200*1024*1024);assert.equal(rules.mediaPartBytes,8*1024*1024);assert.equal(rules.mediaPartCount(8*1024*1024),1);assert.equal(rules.mediaPartCount(8*1024*1024+1),2);assert.equal(rules.mediaPartCount(rules.maxMediaBytes),25);assert.ok(rules.mediaPartCount(rules.maxMediaBytes)*rules.mediaPartAttempts<=rules.uploadPartLimit);assert.equal(rules.uploadPartWindowSeconds,10*60);
});
test('video replies reject URLs, media, embeds; plain text remains valid',()=>{
 for(const text of ['https://example.com','www.example.com','<img src=x>','[x](video)','youtu.be/abcdefghijk','watch.example.xyz/path'])assert.throws(()=>rules.validateReply(text,null));assert.throws(()=>rules.validateReply('Hello','https://youtu.be/abcdefghijk'));assert.doesNotThrow(()=>rules.validateReply('とても参考になりました。',null));
});
test('permission matrix does not grant management based on a name',()=>{
 assert.equal(rules.mayModerate('user','pin',false),false);assert.equal(rules.mayModerate('moderator','moderator',false),false);assert.equal(rules.mayModerate('moderator','delete',true),true);assert.equal(rules.mayModerate('moderator','delete',false),true);assert.equal(rules.mayModerate('owner','delete',true),true);
});
test('public browsing and anonymous mutations work while cross-origin writes fail closed',async()=>{
 const {call}=setup();const guest=await call(null,'');assert.equal(guest.status,200);assert.equal(guest.data.me,null);const cookie=guest.headers.get('set-cookie');assert.match(cookie??'',/^__Host-lr_guest=v1\./);const same=await call(null,'','','test@example.invalid','https://review.example',cookie);assert.equal(same.data.me,null);const forged=cookie.replace(/(v1\.[^;]+\.)[^;]+/,'$1x');const rotated=await call(null,'','','test@example.invalid','https://review.example',forged);assert.equal(rotated.status,200);assert.equal(rotated.data.me,null);assert.match(rotated.headers.get('set-cookie')??'',/^__Host-lr_guest=v1\./);const profile=await call({action:'profile',name:'hello'},'','','test@example.invalid','https://review.example',cookie);assert.equal(profile.status,200);const profileCookie=profile.headers.get('set-cookie')??'';assert.match(profileCookie,/__Host-lr_display_name=hello/);const savedNameCookie=(profileCookie.match(/__Host-lr_display_name=[^,]+/)||[''])[0];const restored=await call(null,'','','test@example.invalid','https://review.example',savedNameCookie);assert.equal(restored.data.me.name,'hello');assert.equal((await call({action:'profile',name:'hello'},'a','','x','https://evil.example')).status,403);assert.equal((await call({action:'profile',name:'hello'},'')).status,200);
});
test('post reports persist once and always write an audit record',async()=>{
 const {call,sql,clearLimits}=setup();
 const author='report-author';const reporter='report-viewer';
 await call({action:'profile',name:'Report Author'},author);const state=(await call(null,author)).data;
 const created=await call({action:'post',board:state.board,body:'Report target',request:crypto.randomUUID()},author);assert.equal(created.status,200);
 await call({action:'profile',name:'Reporter'},reporter);clearLimits();
 const first=await call({action:'report',post:created.data.id},reporter);assert.equal(first.status,200);
 clearLimits();const second=await call({action:'report',post:created.data.id},reporter);assert.equal(second.status,200);
 assert.equal(Number(sql.prepare('SELECT COUNT(*) count FROM post_reports WHERE post=?').get(created.data.id).count),1);
 const audits=sql.prepare("SELECT action,target FROM audit WHERE action='report' AND target=?").all(created.data.id);assert.equal(audits.length,2);
});

test('viewer bridge token is retained only in memory after the board binds it',()=>{
 assert.match(communitySource,/let viewerTokenCache=''/);
 assert.match(communitySource,/scrubViewerTokenFromLocation/);
 assert.match(communitySource,/url\.searchParams\.delete\('viewer'\)/);
 assert.match(communitySource,/history\.replaceState\(history\.state/);
 assert.match(communitySource,/fetch\(withViewerQuery\('\/api\/board'\)/);
});

test('owner activation exchanges a private access key for a signed cookie without login',async()=>{
 const {call,anonymous,sql}=setup();const activated=await anonymous.activateOwner('test-owner-access-token');assert.ok(activated);assert.match(activated.setCookie,/^__Host-lr_owner=o1\.[0-9]+\./);assert.ok(activated.setCookies?.some(cookie=>cookie.includes('__Host-lr_display_name=')));
 assert.match(activated.setCookie,/Max-Age=31536000/);const session=await anonymous.sessionFromHeaders(new Headers({cookie:activated.setCookie}));assert.equal(session.owner,true);assert.equal(session.sub,'owner-subject');assert.equal(session.displayName,'LINEレンジャーは神ゲー');assert.match(session.setCookie||'',/^__Host-lr_owner=o1\.[0-9]+\./);
 const owner=await call(null,'','','owner@example.invalid','https://review.example',activated.setCookie);assert.equal(owner.status,200);assert.equal(owner.data.me.role,'owner');assert.equal(owner.data.me.display_name_set,1);assert.equal(owner.data.me.name,'LINEレンジャーは神ゲー');
 const named=await call({action:'profile',name:'別の名前'},'','','owner@example.invalid','https://review.example',activated.setCookie);assert.equal(named.status,200);assert.equal(named.data.me.role,'owner');assert.equal(named.data.me.name,'LINEレンジャーは神ゲー');const savedCookie=named.headers.get('set-cookie')||'';assert.match(savedCookie,/__Host-lr_display_name=LINE%E3%83%AC%E3%83%B3%E3%82%B8%E3%83%A3%E3%83%BC%E3%81%AF%E7%A5%9E%E3%82%B2%E3%83%BC/);assert.match(savedCookie,/HttpOnly/);
 const displayCookie=(savedCookie.match(/__Host-lr_display_name=[^;]+/)||[''])[0];const restoredSession=await anonymous.sessionFromHeaders(new Headers({cookie:`${activated.setCookie}; ${displayCookie}`}));assert.equal(restoredSession.owner,true);assert.equal(restoredSession.displayName,'LINEレンジャーは神ゲー');
 const restored=await call(null,'','','owner@example.invalid','https://review.example',activated.setCookie);assert.equal(restored.data.me.role,'owner');assert.equal(restored.data.me.name,'LINEレンジャーは神ゲー');assert.equal(restored.data.me.display_name_set,1);const ownerRow=sql.prepare("SELECT name,display_name_set,role FROM users WHERE subject='owner-subject'").get();assert.equal(ownerRow.name,'LINEレンジャーは神ゲー');assert.equal(ownerRow.display_name_set,1);assert.equal(ownerRow.role,'owner');
 assert.equal(await anonymous.activateOwner('wrong-token'),null);
});
test('profile rename preserves identity and never grants owner via display name or payload',async()=>{
 const {call}=setup();await call({action:'profile',name:'運営',role:'owner'});const first=(await call()).data.me;assert.equal(first.role,'user');await call({action:'profile',name:'new name'});const second=(await call()).data.me;assert.equal(first.id,second.id);assert.equal(second.name,'new name');
});
test('only the first verified owner subject is bound as Owner',async()=>{
 const {call}=setup();await call({action:'profile',name:'Owner'},'owner-subject','', 'owner@example.invalid');await call({action:'profile',name:'Impersonator'},'owner-b','', 'owner@example.invalid');
 assert.equal((await call(null,'owner-subject','', 'owner@example.invalid')).data.me.role,'owner');
 assert.equal((await call(null,'owner-b','', 'owner@example.invalid')).data.me.role,'user');
});
test('opaque owner subject can bootstrap the Owner without exposing an email',async()=>{
 const {call}=setup();await call({action:'profile',name:'Owner'},'owner-subject','','different@example.invalid');assert.equal((await call(null,'owner-subject','','different@example.invalid')).data.me.role,'owner');
});
test('adding the owner secret later safely promotes only the verified subject',async()=>{
 const {call}=setup();await call({action:'profile',name:'Owner'},'owner-later','','different@example.invalid');
 const spoofed=(await call({action:'profile',name:'Owner renamed'},'owner-later','','owner@example.invalid')).data.me;
 assert.equal(spoofed.role,'user');assert.equal(spoofed.name,'Owner renamed');
 const other=(await call({action:'profile',name:'Other'},'owner-b','','owner@example.invalid')).data.me;assert.equal(other.role,'user');
});
test('a verified owner is promoted on read without requiring a profile edit',async()=>{
 const {call,sql}=setup();sql.prepare('INSERT INTO users(id,subject,name,role,created) VALUES(?,?,?,?,?)').run(crypto.randomUUID(),'owner-subject','Existing Owner','user',Date.now());
 const result=await call(null,'owner-subject','','different@example.invalid');assert.equal(result.status,200);assert.equal(result.data.me.role,'owner');
});
test('Owner-only feature-flag permissions persist while reads stay available',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Owner'},'owner-subject','','owner@example.invalid');await call({action:'profile',name:'Member'},'member','','member@example.invalid');
 const initial=(await call(null,'owner-subject','','owner@example.invalid')).data;assert.deepEqual(initial.flags,{commentsEnabled:true,videoUploadEnabled:true,translationEnabled:true,votingEnabled:true,readOnly:false});
 const memberState=(await call(null,'member','','member@example.invalid')).data;
 assert.equal((await call({action:'moderate',operation:'moderator',target:memberState.me.id},'owner-subject','','owner@example.invalid')).status,200);
 const memberToggle=await call({action:'feature_flag',name:'commentsEnabled',enabled:false},'member','','member@example.invalid');assert.equal(memberToggle.status,403);assert.equal(memberToggle.data.error,'forbidden');
 const disabled=await call({action:'feature_flag',name:'commentsEnabled',enabled:false},'owner-subject','','owner@example.invalid');assert.equal(disabled.status,200);assert.deepEqual(disabled.data,{ok:true,name:'commentsEnabled',enabled:false});
 const stoppedPost=await call({action:'post',board:initial.board,body:'Blocked while comments are disabled',request:crypto.randomUUID()},'owner-subject','','owner@example.invalid');assert.equal(stoppedPost.status,503);assert.equal(stoppedPost.data.error,'feature_disabled');
 assert.equal((await call({action:'feature_flag',name:'commentsEnabled',enabled:true},'owner-subject','','owner@example.invalid')).status,200);
 const posted=await call({action:'post',board:initial.board,body:'Existing content remains readable',request:crypto.randomUUID()},'owner-subject','','owner@example.invalid');assert.equal(posted.status,200);
 const memberReadOnly=await call({action:'feature_flag',name:'readOnly',enabled:true},'member','','member@example.invalid');assert.equal(memberReadOnly.status,403);assert.equal(memberReadOnly.data.error,'forbidden');
 assert.equal((await call({action:'feature_flag',name:'readOnly',enabled:true},'owner-subject','','owner@example.invalid')).status,200);
 const readable=await call(null,'owner-subject','','owner@example.invalid');assert.equal(readable.status,200);assert.equal(readable.data.posts.length,1);assert.equal(readable.data.flags.readOnly,true);
 for(const action of [
  {action:'post',board:initial.board,body:'Blocked by read only',request:crypto.randomUUID()},
  {action:'like',post:posted.data.id,liked:true},
  {action:'helpful',post:posted.data.id,selected:true},
  {action:'vote',board:initial.board,poll:'strength',choice:0},
 ]){const result=await call(action,'owner-subject','','owner@example.invalid');assert.equal(result.status,503);assert.equal(result.data.error,'read_only');}
 assert.equal((await call({action:'feature_flag',name:'readOnly',enabled:false},'owner-subject','','owner@example.invalid')).status,200);
 assert.throws(()=>sql.prepare('INSERT INTO feature_flags(name,enabled,updated) VALUES(?,?,?)').run('commentsEnabled',1,Date.now()));
 assert.ok(sql.prepare("SELECT COUNT(*) n FROM audit WHERE action='feature_flag'").get().n>=4);
});
test('archived month boards remain visible even when not in the current confirmed topic list',async()=>{
 const {call,sql}=setup();sql.prepare('INSERT INTO boards(id,month,character,name,image) VALUES(?,?,?,?,?)').run('2026-08:archived-character','2026-08','archived-character','Archived Ranger','https://example.invalid/archived.png');await call({action:'profile',name:'Archive reader'},'archive-reader','','archive@example.invalid');
 const result=await call(null,'archive-reader','', 'archive@example.invalid');
 const archived=await call(null,'archive-reader','?month=2026-08','archive@example.invalid');
 assert.equal(result.status,200);assert.deepEqual(archived.data.boards.map(b=>b.id),['2026-08:archived-character']);
 const blockedPost=await call({action:'post',board:'2026-08:archived-character',body:'Archived write',request:crypto.randomUUID()},'archive-reader','','archive@example.invalid');assert.equal(blockedPost.status,409);assert.equal(blockedPost.data.error,'archive_readonly');
 const blockedVote=await call({action:'vote',board:'2026-08:archived-character',poll:'strength',choice:0},'archive-reader','','archive@example.invalid');assert.equal(blockedVote.status,409);assert.equal(blockedVote.data.error,'archive_readonly');
 const archivedPost=crypto.randomUUID();sql.prepare("INSERT INTO posts(id,board,author,parent,body,status,pinned,created,request) VALUES(?,?,?,NULL,?,'visible',0,?,?)").run(archivedPost,'2026-08:archived-character',result.data.me.id,'Archived existing post',Date.now(),crypto.randomUUID());
 for(const action of [{action:'like',post:archivedPost,liked:true},{action:'helpful',post:archivedPost,selected:true},{action:'post',board:'2026-08:archived-character',parent:archivedPost,body:'Archived reply',request:crypto.randomUUID()}]){const blocked=await call(action,'archive-reader','','archive@example.invalid');assert.equal(blocked.status,409);assert.equal(blocked.data.error,'archive_readonly');}
 sql.prepare('INSERT INTO boards(id,month,character,name,image) VALUES(?,?,?,?,?)').run('2026-09:unconfirmed-character','2026-09','unconfirmed-character','Unconfirmed Ranger','https://example.invalid/unconfirmed.png');
 const unconfirmedVote=await call({action:'vote',board:'2026-09:unconfirmed-character',poll:'strength',choice:0},'archive-reader','','archive@example.invalid');assert.equal(unconfirmedVote.status,404);assert.equal(unconfirmedVote.data.error,'not_found');
});
test('poll upsert keeps a single vote per user on the selected evolution board',async()=>{
 const {call}=setup();await call({action:'profile',name:'Tester'});const data=(await call()).data;assert.equal(data.boards.length,1);const id=data.boards[0].id;
 for(const choice of [0,1,2])assert.equal((await call({action:'vote',board:id,poll:'strength',choice})).status,200);
 const result=(await call()).data;assert.equal(result.poll.reduce((n,r)=>n+r.count,0),1);assert.equal(result.mine[0].choice,2);assert.equal((await call({action:'vote',board:id,poll:'strength',choice:8})).status,400);
});
test('posts persist, idempotent retry does not duplicate, and reaction names are private',async()=>{
 const {call}=setup();await call({action:'profile',name:'Tester'});const board=(await call()).data.board;const p={action:'post',board,body:'<script>alert(1)</script> is stored as text',request:crypto.randomUUID()};const first=await call(p);assert.equal(first.status,200);assert.equal((await call(p)).data.id,first.data.id);
 for(let i=0;i<2;i++)assert.equal((await call({action:'like',post:first.data.id,liked:true})).status,200);
 const result=(await call()).data;assert.equal(result.posts.length,1);assert.equal(result.posts[0].likes,1);assert.equal(result.posts[0].body,p.body);assert.equal((await call(null,'test-a','?likers='+first.data.id)).status,404);
});
test('users can delete only their own posts while moderation rules remain server-side',async()=>{
 const {call}=setup();await call({action:'profile',name:'Tester'});const board=(await call()).data.board;const own=(await call({action:'post',board,body:'自分で削除する投稿',request:crypto.randomUUID()})).data.id;
 assert.equal((await call({action:'moderate',operation:'delete',target:own})).status,200);assert.equal((await call()).data.posts.length,0);
});
test('deleting a grouped media post removes every R2 object in the group',async()=>{
 const {call,sql,deletedObjects}=setup();await call({action:'profile',name:'Media owner'});const state=(await call()).data;const group=crypto.randomUUID();const imageKey='uploads/test/image.jpg';const videoKey='uploads/test/video.mp4';const image=crypto.randomUUID();const video=crypto.randomUUID();
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(image,state.board,state.me.id,'Grouped media',imageKey,'image/jpeg','image.jpg',10,group,Date.now(),crypto.randomUUID());
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(video,state.board,state.me.id,'Grouped media',videoKey,'video/mp4','video.mp4',20,group,Date.now()+1,crypto.randomUUID());
 assert.equal((await call({action:'moderate',operation:'delete',target:image})).status,200);
 assert.deepEqual(new Set(deletedObjects),new Set([imageKey,videoKey]));
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n,0);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM posts WHERE media_group=? AND status=\'deleted\'').get(group).n,2);
});
test('JSON posts reject legacy video URLs and cap video comment replies at one nested level',async()=>{
 const {call,sql,clearLimits}=setup();await call({action:'profile',name:'Tester'});const state=(await call()).data;const parent=crypto.randomUUID();
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?, 'visible',0,?,?)").run(parent,state.board,state.me.id,'Attached video','media/test.mp4','video/mp4','test.mp4',10,Date.now(),crypto.randomUUID());
 assert.equal((await call({action:'post',board:state.board,body:'Legacy URL',video:'https://youtu.be/abcdefghijk',request:crypto.randomUUID()})).data.error,'invalid_request');clearLimits();
 const reply=await call({action:'post',board:state.board,parent,body:'Thanks for sharing',request:crypto.randomUUID()});assert.equal(reply.status,200);clearLimits();
 const nested=await call({action:'post',board:state.board,parent:reply.data.id,body:'I agree',request:crypto.randomUUID()});assert.equal(nested.status,200);clearLimits();
 assert.equal((await call({action:'post',board:state.board,parent:nested.data.id,body:'Fourth layer',request:crypto.randomUUID()})).data.error,'text_only');
 const rootReplies=(await call(null,'test-a','?replies='+parent)).data.posts;assert.deepEqual(rootReplies.map(p=>p.id),[reply.data.id]);assert.equal(rootReplies[0].replies,1);const nestedReplies=(await call(null,'test-a','?replies='+reply.data.id)).data.posts;assert.deepEqual(nestedReplies.map(p=>p.id),[nested.data.id]);assert.equal(nestedReplies[0].replies,0);
});
test('server moderation, owner-only role changes and audit records',async()=>{
 const {call,sql,clearLimits}=setup();await call({action:'profile',name:'Owner'},'owner-subject','','owner@example.invalid');await call({action:'profile',name:'Member'},'member','','member@example.invalid');await call({action:'profile',name:'Reviewer'});const member=(await call(null,'member','','member@example.invalid')).data.me;const board=(await call()).data.board;const post=(await call({action:'post',board,body:'Review',request:crypto.randomUUID()})).data.id;
 assert.equal((await call({action:'moderate',operation:'pin',target:post})).status,403);
 assert.equal((await call({action:'moderate',operation:'moderator',target:member.id},'owner-subject')).status,200);const memberAfterReload=(await call(null,'member','','member@example.invalid')).data;assert.equal(memberAfterReload.me.role,'moderator');const ownerView=(await call(null,'owner-subject','?admin=1','owner@example.invalid')).data;assert.equal(ownerView.users.find(user=>user.id===member.id).role,'moderator');assert.equal((await call({action:'moderate',operation:'pin',target:post},'member','','member@example.invalid')).status,200);
 assert.equal((await call({action:'moderate',operation:'moderator',target:member.id})).status,403);
 assert.equal((await call({action:'moderate',operation:'hide',target:post},'member','','member@example.invalid')).status,200);assert.equal((await call()).data.posts.length,0);assert.equal((await call(null,'test-a','?likers='+post)).status,404);
 clearLimits();assert.equal((await call({action:'moderate',operation:'restore',target:post},'member','','member@example.invalid')).status,200);assert.equal((await call()).data.posts.length,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM audit').get().n,4);
});
test('badges are manageable by Owner and moderators while roles stay protected',async()=>{
 const {call,sql,clearLimits}=setup();await call({action:'profile',name:'Owner'},'owner-subject','','owner@example.invalid');await call({action:'profile',name:'Member'},'member','','member@example.invalid');await call({action:'profile',name:'Target'},'target','','target@example.invalid');
 const ownerState=(await call(null,'owner-subject','','owner@example.invalid')).data;const memberState=(await call(null,'member','','member@example.invalid')).data;const targetState=(await call(null,'target','','target@example.invalid')).data;
 assert.equal((await call({action:'badge',target:memberState.me.id,badge:'helpful_contributor',enabled:true},'member','','member@example.invalid')).status,403);
 assert.equal((await call({action:'badge',target:memberState.me.id,badge:'helpful_contributor',enabled:true},'owner-subject','','owner@example.invalid')).status,200);
 assert.equal((await call({action:'badge',target:ownerState.me.id,badge:'helpful_contributor',enabled:true},'owner-subject','','owner@example.invalid')).status,200);
 const ownerWithBadge=(await call(null,'owner-subject','','owner@example.invalid')).data;assert.deepEqual(ownerWithBadge.me.badges,['helpful_contributor']);
 const ownerPost=(await call({action:'post',board:ownerState.board,body:'Owner contribution',request:crypto.randomUUID()},'owner-subject','','owner@example.invalid')).data.id;
 assert.deepEqual((await call(null,'owner-subject','','owner@example.invalid')).data.posts.find(post=>post.id===ownerPost).badges,['helpful_contributor']);
 const textPost=(await call({action:'post',board:ownerState.board,body:'Useful information',request:crypto.randomUUID()},'member','','member@example.invalid')).data.id;
 const listed=(await call(null,'member','','member@example.invalid')).data.posts.find(p=>p.id===textPost);assert.deepEqual(listed.badges,['helpful_contributor']);
 const admin=(await call(null,'owner-subject','?admin=1','owner@example.invalid')).data;assert.deepEqual(admin.users.find(u=>u.id===memberState.me.id).badges,['helpful_contributor']);
 clearLimits();assert.equal((await call({action:'moderate',operation:'moderator',target:memberState.me.id},'owner-subject','','owner@example.invalid')).status,200);
 assert.equal((await call({action:'badge',target:targetState.me.id,badge:'video_contributor',enabled:true},'member','','member@example.invalid')).status,200);
 assert.equal((await call({action:'badge',target:ownerState.me.id,badge:'video_contributor',enabled:true},'member','','member@example.invalid')).status,403);
 const moderatorAdmin=(await call(null,'member','?admin=1','member@example.invalid')).data;assert.deepEqual(moderatorAdmin.users.find(u=>u.id===targetState.me.id).badges,['video_contributor']);
 assert.equal((await call({action:'badge',target:targetState.me.id,badge:'video_contributor',enabled:false},'member','','member@example.invalid')).status,200);
 clearLimits();const video=crypto.randomUUID();sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?, 'visible',0,?,?)").run(video,ownerState.board,memberState.me.id,'Uploaded video',`media/${video}`,'video/mp4','clip.mp4',100,Date.now(),crypto.randomUUID());
 clearLimits();assert.equal((await call({action:'moderate',operation:'delete',target:video},'member','','member@example.invalid')).status,200);assert.equal(sql.prepare("SELECT status FROM posts WHERE id=?").get(video).status,'deleted');
});
test('Owner permission list includes named loginless users but excludes anonymous sessions',async()=>{
 const {call}=setup();
 const owner=await call({action:'profile',name:'Owner'},'owner-subject','','owner@example.invalid');assert.equal(owner.status,200);
 const named=await call({action:'profile',name:'名前ありユーザー'},'');assert.equal(named.status,200);
 const anonymous=await call(null,'');assert.equal(anonymous.status,200);assert.equal(anonymous.data.me,null);
 const admin=(await call(null,'owner-subject','?admin=1','owner@example.invalid')).data;
 assert.ok(admin.users.some(u=>u.name==='名前ありユーザー'));
 assert.ok(!admin.users.some(u=>/^ゲスト-/.test(u.name)));
});
test('legacy named profiles remain manageable without exposing generated guest labels',async()=>{
 const {call,sql}=setup();
 await call({action:'profile',name:'Owner'},'owner-subject','','owner@example.invalid');
 const legacyNamed=crypto.randomUUID();const legacyGuest=crypto.randomUUID();
 sql.prepare('INSERT INTO users(id,subject,name,role,created) VALUES(?,?,?,?,?)').run(legacyNamed,'legacy-named','保存済みの名前','user',Date.now());
 sql.prepare('INSERT INTO users(id,subject,name,role,created) VALUES(?,?,?,?,?)').run(legacyGuest,'legacy-guest','ゲスト-ABCD','user',Date.now());
 const admin=(await call(null,'owner-subject','?admin=1','owner@example.invalid')).data;
 assert.ok(admin.users.some(u=>u.id===legacyNamed));assert.ok(!admin.users.some(u=>u.id===legacyGuest));
});
test('server enforces bounded burst limits',async()=>{
 const {call}=setup();for(let i=0;i<3;i++)assert.equal((await call({action:'profile',name:'A'})).status,200);assert.equal((await call({action:'profile',name:'A'})).status,429);
});
test('helpful reactions are unique, removable, separate from likes, and names stay private',async()=>{
 const {call}=setup();await call({action:'profile',name:'Reader'});const board=(await call()).data.board;
 const post=(await call({action:'post',board,body:'A useful review',request:crypto.randomUUID()})).data.id;
 for(let i=0;i<2;i++)assert.equal((await call({action:'helpful',post,selected:true})).status,200);
 const row=(await call(null,'test-a','?sort=helpful')).data.posts[0];assert.equal(row.helpful,1);assert.equal(row.helped,true);assert.equal(row.likes,0);assert.equal('author' in row,false);
 assert.equal((await call(null,'test-a','?helpers='+post)).status,404);
 assert.equal((await call({action:'helpful',post,selected:false})).status,200);assert.equal((await call()).data.posts[0].helpful,0);
});
test('root comments can receive one direct text reply',async()=>{
 const {call,clearLimits}=setup();await call({action:'profile',name:'Author'});const board=(await call()).data.board;const root=(await call({action:'post',board,body:'Top-level review',request:crypto.randomUUID()})).data.id;
 clearLimits();const reply=await call({action:'post',board,parent:root,body:'Direct reply',request:crypto.randomUUID()});assert.equal(reply.status,200);clearLimits();
 const nested=await call({action:'post',board,parent:reply.data.id,body:'Nested ordinary reply',request:crypto.randomUUID()});assert.equal(nested.data.error,'text_only');
 assert.deepEqual((await call(null,'test-a','?replies='+root)).data.posts.map(p=>p.body),['Direct reply']);
});
test('initial board page uses a stable cursor after twenty posts and keeps offset only for ranked sorts',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Author'});const state=(await call()).data;const now=Date.now();
 for(let i=0;i<21;i++)sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,'visible',0,?,?)").run(crypto.randomUUID(),state.board,state.me.id,'Post '+i,now+i,crypto.randomUUID());
 const first=(await call()).data;assert.equal(first.posts.length,20);assert.equal(first.stats.comments,21);assert.match(first.nextCursor,/^[01]:\d+:[a-f0-9-]{36}$/);
 const second=(await call(null,'test-a','?cursor='+encodeURIComponent(first.nextCursor))).data;assert.equal(second.posts.length,1);assert.equal(second.nextCursor,null);
 assert.equal((await call(null,'test-a','?cursor=2:1:'+crypto.randomUUID())).status,400);
 assert.equal((await call(null,'test-a','?sort=likes&offset=20')).data.posts.length,1);
});
test('new-post checks return only records after the caller cursor and preserve exact board activity',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Author'});const initial=(await call()).data;const created=Date.now();
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,'visible',0,?,?)").run(crypto.randomUUID(),initial.board,initial.me.id,'Fresh board comment',created,crypto.randomUUID());
 const newer=(await call(null,'test-a','?newerThan='+initial.stats.latestCreated)).data;
 assert.equal(newer.posts.length,1);assert.equal(newer.count,1);assert.equal(newer.posts[0].body,'Fresh board comment');assert.equal(newer.latestCreated,created);
});
test('new-post cursor keeps same-timestamp records addressable by id',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Author'});const initial=(await call()).data;const created=Date.now();
 const firstId='00000000-0000-4000-8000-000000000001';sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,'visible',0,?,?)").run(firstId,initial.board,initial.me.id,'Same-time first',created,crypto.randomUUID());
 const state=(await call()).data;const cursor=`${state.stats.latestCreated}.${state.stats.latestId}`;const secondId='00000000-0000-4000-8000-000000000002';sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,'visible',0,?,?)").run(secondId,initial.board,initial.me.id,'Same-time second',created,crypto.randomUUID());
 const newer=(await call(null,'test-a','?after='+encodeURIComponent(cursor))).data;assert.equal(newer.posts.length,1);assert.equal(newer.posts[0].body,'Same-time second');
 const countOnly=(await call(null,'test-a','?after='+encodeURIComponent(cursor)+'&countOnly=1')).data;assert.equal(countOnly.count,1);assert.equal(countOnly.latestId,secondId);
});
test('read marker is persistent, monotonic, activity-based and rejects future timestamps',async()=>{
 const {call,sql}=setup();const before=(await call()).data;assert.equal(before.previousSeen,0);
 const first=await call({action:'seen',until:before.viewUntil});assert.equal(first.status,200);assert.equal(first.data.seen,1);
 const state=(await call()).data;const author=state.me?.id||crypto.randomUUID();
 if(!state.me)sql.prepare('INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)').run(author,'cursor-author','Cursor Author',1,'user',Date.now());
 const created=Date.now();sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,?,?,NULL,'visible',0,?,?)").run(crypto.randomUUID(),state.board,author,null,'Cursor target',created,crypto.randomUUID());
 const second=await call({action:'seen',until:Date.now()});assert.equal(second.status,200);assert.ok(second.data.seen>=created);
 const third=await call({action:'seen',until:before.viewUntil-1000});assert.equal(third.status,200);assert.ok(third.data.seen>=second.data.seen);
 assert.equal((await call({action:'seen',until:Date.now()+60000})).status,400);
});


test('anonymous read cursors stay isolated per signed guest subject',async()=>{
 const {call,activityCall,sql}=setup();await call({action:'profile',name:'Publisher'});const board=(await call()).data.board;
 const first=await call(null,'');const second=await call(null,'');const cookieA=first.headers.get('set-cookie')||'';const cookieB=second.headers.get('set-cookie')||'';
 assert.match(cookieA,/^__Host-lr_guest=/);assert.match(cookieB,/^__Host-lr_guest=/);assert.notEqual(cookieA,cookieB);
 const bSeenAt=Date.now()-1000;assert.equal((await call({action:'seen',until:bSeenAt},'','','test@example.invalid','https://review.example',cookieB)).status,200);
 const post=await call({action:'post',board,body:'Unread for one guest only',request:crypto.randomUUID()});assert.equal(post.status,200);
 const aSeenAt=Date.now();assert.equal((await call({action:'seen',until:aSeenAt},'','','test@example.invalid','https://review.example',cookieA)).status,200);
 const aActivity=await activityCall('',cookieA);const bActivity=await activityCall('',cookieB);
 assert.equal(aActivity.status,200);assert.equal(bActivity.status,200);assert.equal(aActivity.data.unread,0);assert.equal(bActivity.data.unread,1);
 const visits=sql.prepare('SELECT subject,seen FROM visits ORDER BY subject').all();assert.equal(visits.length,2);assert.notEqual(visits[0].subject,visits[1].subject);
});



test('badge administration persists and refreshes both owner state and admin rows',()=>{
  const source=readFileSync(new URL('app/community.tsx',root),'utf8');
  assert.match(source,/credentials:'same-origin'/);
  assert.ok(source.includes('await Promise.all([reload(),loadAdmin()])'));
});

test('community board supports Japanese, English, Chinese, and Thai with ten-image five-video media caps', () => {
  const source = readFileSync(new URL('app/community.tsx', root), 'utf8');
  const labelsSource = readFileSync(new URL('lib/labels.ts', root), 'utf8');
  const characterConfig = JSON.parse(readFileSync(new URL('config/community-characters.json', root), 'utf8'));
  const activitySource = readFileSync(new URL('lib/activity-labels.ts', root), 'utf8');
  const translationSource = readFileSync(new URL('app/api/translate/route.ts', root), 'utf8');
  const directUpload = readFileSync(new URL('app/api/upload/route.ts', root), 'utf8');
  const videoSession = readFileSync(new URL('app/api/upload/session/route.ts', root), 'utf8');
  assert.deepEqual(rules.languages, ['ja','en','zh','th']);
  assert.equal(rules.maxImagesPerPost, 10);
  assert.equal(rules.maxVideosPerPost, 5);
  assert.match(labelsSource, /localeNames=\{ja:'🇯🇵 日本語',en:'🇺🇸 English',zh:'中文',th:'🇹🇭 ไทย'\}/);
  assert.match(labelsSource, /const zh:Labels=/);
  assert.match(labelsSource, /const th:Labels=/);
  assert.match(activitySource, /zh:\{helpful:/);
  assert.match(activitySource, /th:\{helpful:/);
  assert.match(translationSource, /googleLanguage:Record<Language,string>=\{ja:'ja',en:'en',zh:'zh-TW',th:'th'\}/);
  assert.match(source, /media-picker-hint\">\{t\.mediaLimitHint\}/);
  assert.match(labelsSource, /ここをタップ（1投稿につき動画5本・画像10枚まで）/);
  assert.match(labelsSource, /Tap here \(up to 5 videos and 10 images per post\)/);
  assert.match(labelsSource, /openImage:'Open image'/);
  assert.match(labelsSource, /owner:'Owner'/);
  assert.match(source, /function boardName\(board:Board,lang:Language\)/);
  assert.match(source, /boardName\(b,lang\)/);
  const sally=characterConfig.characters.find(character=>character.id==='u1631e-sally');
  assert.equal(sally.nameEn, 'Cancer Sally');
  assert.equal(sally.nameZh, '巨蟹座 莎莉');
  assert.equal(sally.nameTh, 'แซลลี่ ราศีกรกฎ');
  assert.match(source, /nameZh\?:string\|null/);
  assert.match(source, /nameTh\?:string\|null/);
  assert.match(source, /lang==='zh'/);
  assert.match(source, /lang==='th'/);
  assert.match(source, /videoCount>maxVideosPerPost/);
  assert.match(source, /imageCount>maxImagesPerPost/);
  assert.match(source, /else void uploadImage\(fileToSend,description,request,uploadBoard,group\)/);
  assert.match(directUpload, /groupLimit=video\?maxVideosPerPost:maxImagesPerPost/);
  assert.match(videoSession, /maxVideosPerPost/);
});


test('public board chrome localizes Japanese-English status and interaction copy', () => {
  const source = readFileSync(new URL('app/community.tsx', root), 'utf8');
  const labelsSource = readFileSync(new URL('lib/labels.ts', root), 'utf8');
  assert.match(labelsSource, /staleData:'Could not refresh the latest data/);
  assert.match(labelsSource, /newCharacterNote:'Share impressions or useful information/);
  assert.match(labelsSource, /showReplies:'Show \{count\} replies'/);
  assert.match(labelsSource, /reportReceived:'Report received\. The moderation team will review it\.'/);
  assert.match(source, /t\.staleData/);
  assert.match(source, /t\.offlineNotice/);
  assert.match(source, /t\.newCharacterNote/);
  assert.match(source, /t\.showReplies\.replace/);
  assert.match(source, /t\.videoContributor/);
  assert.match(source, /t\.reportReceived/);
  assert.match(source, /uiName\(replyTarget\.name,t\.anonymousUser\)/);
  assert.doesNotMatch(source, /新キャラに関する感想・情報を投稿してください。/);
  assert.doesNotMatch(source, /現在オフラインです。入力内容はこの端末に保存されます。/);
  assert.doesNotMatch(source, /最新データを取得できません。前回の表示を続けています。/);
});


test('media images open one selected item in an accessible lightbox',()=>{
 assert.match(communitySource,/media-image-button/);
 assert.match(communitySource,/setLightbox\(\{src,alt\}\)/);
 assert.match(communitySource,/role="dialog" aria-modal="true"/);
 assert.match(communitySource,/event\.key==='Escape'/);
 assert.match(communityCss,/\.media-lightbox-image/);
 assert.match(communityCss,/\.media-image-button:focus-visible/);
});

test('media groups render as one mixed post and open a shared comparison page',()=>{
 assert.match(communitySource,/media-image-grid/);
 assert.match(communitySource,/media-video-grid/);
 assert.match(communitySource,/media-video-compare-grid/);
 assert.match(communitySource,/group:p\.mediaGroup/);
 assert.match(communitySource,/data\?\.video\?\.id\|\|video/);
 assert.match(communityCss,/\.media-image-grid\.media-count-3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
 assert.match(communityCss,/\.media-video-compare-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('group detail returns every sibling media item and group moderation stays atomic',async()=>{
 const {call,sql,clearLimits}=setup();await call({action:'profile',name:'Group Tester'});const state=(await call()).data;const group=crypto.randomUUID();let now=Date.now();
 const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
 const rows=[[ids[0],'image/jpeg','a.jpg'],[ids[1],'image/png','b.png'],[ids[2],'image/webp','c.webp'],[ids[3],'video/mp4','clip.mp4']];
 for(const [id,type,name] of rows)sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(id,state.board,state.me.id,'Grouped media',`media/${id}`,type,name,100,group,now++,crypto.randomUUID());
 const detail=await call(null,'test-a','?board='+encodeURIComponent(state.board)+'&group='+group);assert.equal(detail.status,200);assert.equal(detail.data.mediaGroup,group);assert.equal(detail.data.mediaItems.length,4);assert.equal(detail.data.video.id,ids[3]);
 const listed=await call();const anchor=listed.data.posts.find(post=>post.id===ids[3]);assert.equal(anchor.mediaItems.length,4);
 clearLimits();assert.equal((await call({action:'moderate',operation:'delete',target:ids[3]})).status,200);assert.deepEqual(sql.prepare('SELECT DISTINCT status FROM posts WHERE media_group=?').all(group).map(row=>row.status),['deleted']);
});


test('grouped media count as one logical post across listing stats, activity, reactions, and replies',async()=>{
 const {call,sql,activityCall}=setup();
 await call({action:'profile',name:'Logical Group Tester'});
 const state=(await call()).data;
 const group=crypto.randomUUID();const start=Date.now();let created=start;
 const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
 const rows=[[ids[0],'image/jpeg','a.jpg'],[ids[1],'image/png','b.png'],[ids[2],'image/webp','c.webp'],[ids[3],'video/mp4','one.mp4'],[ids[4],'video/webm','two.webm']];
 for(const [id,type,name] of rows)sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(id,state.board,state.me.id,'One logical post',`media/${id}`,type,name,100,group,created++,crypto.randomUUID());
 const legacyUser=crypto.randomUUID();sql.prepare('INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)').run(legacyUser,'legacy-reactor','Legacy Reactor',1,'user',Date.now());sql.prepare('INSERT INTO likes(post,user,created) VALUES(?,?,?)').run(ids[0],legacyUser,Date.now());sql.prepare('INSERT INTO helpful(post,user,created) VALUES(?,?,?)').run(ids[0],legacyUser,Date.now());sql.prepare('INSERT INTO visits(subject,seen) VALUES(?,?)').run('test-a',start-1);
 const activity=await activityCall();assert.equal(activity.status,200);assert.equal(activity.data.unread,0);assert.equal(activity.data.videos,2);assert.equal(activity.data.comments,1);assert.equal(activity.data.featured.id,ids[3]);assert.equal(Number(activity.data.featured.likes),1);assert.equal(Number(activity.data.featured.helpful),1);
 const listed=await call();const grouped=listed.data.posts.filter(post=>post.mediaGroup===group);
 assert.equal(grouped.length,1);assert.equal(grouped[0].mediaItems.length,5);
 assert.equal(listed.data.stats.comments,1);assert.equal(listed.data.stats.todayComments,1);assert.equal(listed.data.stats.videos,2);assert.equal(listed.data.stats.unread,0);
 const counted=await call(null,'test-a','?board='+encodeURIComponent(state.board)+'&newerThan='+(start-1)+'&countOnly=1');
 assert.equal(counted.status,200);assert.equal(counted.data.count,1);
 const directLike=await call({action:'like',post:ids[0],liked:true});assert.equal(directLike.status,200);const directHelpful=await call({action:'helpful',post:ids[0],selected:true});assert.equal(directHelpful.status,200);
 assert.deepEqual(sql.prepare('SELECT post FROM likes ORDER BY user').all().map(row=>row.post).sort(),[ids[0],ids[3]].sort());assert.deepEqual(sql.prepare('SELECT post FROM helpful ORDER BY user').all().map(row=>row.post).sort(),[ids[0],ids[3]].sort());
 const afterReactions=(await call()).data.posts.find(post=>post.id===ids[3]);assert.equal(afterReactions.likes,2);assert.equal(afterReactions.helpful,2);
 const reply=await call({action:'post',board:state.board,parent:ids[0],body:'Reply to the grouped post',request:crypto.randomUUID()});assert.equal(reply.status,200);assert.equal(sql.prepare('SELECT parent FROM posts WHERE id=?').get(reply.data.id).parent,ids[3]);assert.deepEqual((await call(null,'test-a','?replies='+ids[0])).data.posts.map(post=>post.id),[reply.data.id]);
 assert.equal((await call({action:'moderate',operation:'delete',target:ids[0]})).status,200);const afterDelete=(await call()).data;assert.equal(afterDelete.posts.some(post=>post.mediaGroup===group),false);assert.equal(afterDelete.stats.comments,0);assert.equal((await call(null,'test-a','?replies='+ids[0])).status,404);
});


test('media groups stay isolated by board and author even if a UUID is reused',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Scoped Group Owner'});const state=(await call()).data;const group=crypto.randomUUID();const now=Date.now();const other=crypto.randomUUID();
 sql.prepare("INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)").run(other,'other:'+other,'Other uploader',1,'user',now);
 const mine=[crypto.randomUUID(),crypto.randomUUID()];for(let i=0;i<mine.length;i++)sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(mine[i],state.board,state.me.id,'mine',`media/${mine[i]}`,'image/jpeg',`mine-${i}.jpg`,100,group,now+i,crypto.randomUUID());
 const otherId=crypto.randomUUID();sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,?,?,?,?,?,'visible',0,?,?)").run(otherId,state.board,other,'other',`media/${otherId}`,'image/jpeg','other.jpg',100,group,now+10,crypto.randomUUID());
 const listed=(await call()).data.posts.filter(post=>post.mediaGroup===group);assert.equal(listed.length,2);const minePost=listed.find(post=>post.mine);const otherPost=listed.find(post=>!post.mine);assert.ok(minePost);assert.ok(otherPost);assert.deepEqual(minePost.mediaItems.map(item=>item.id),mine);assert.deepEqual(otherPost.mediaItems.map(item=>item.id),[otherId]);
});

test('grouped-media optimistic accounting and scope indexes stay aligned with server semantics',()=>{
 const communitySource=readFileSync(new URL('app/community.tsx',root),'utf8');const boardSource=readFileSync(new URL('app/api/board/route.ts',root),'utf8');const direct=readFileSync(new URL('app/api/upload/route.ts',root),'utf8');const session=readFileSync(new URL('app/api/upload/session/route.ts',root),'utf8');const schemaSource=readFileSync(new URL('db/schema.ts',root),'utf8');const migration=readFileSync(new URL('drizzle/0011_grouped_media_scope_indexes.sql',root),'utf8');
 assert.match(communitySource,/function applyLocalMediaPost/);assert.match(communitySource,/item=>item.mediaGroup===post.mediaGroup/);assert.doesNotMatch(communitySource,/comments:current.stats.comments+1,todayComments:current.stats.todayComments+1/);assert.match(communitySource,/stats\.unread/);assert.match(communitySource,/t\.newCount/);assert.doesNotMatch(communitySource,/today-comments/);assert.match(boardSource,/const unread=/);assert.match(communitySource,/fetch\(withViewerQuery\('\/api\/board'\)/);assert.match(boardSource,/b\.action==='seen'\?\(requestUrl\.searchParams\.get\('viewer'\)/);
 assert.match(boardSource,/SELECT id,board,author,parent,video/);assert.match(boardSource,/byScope/);assert.match(direct,/SELECT author,board,body FROM posts WHERE media_group=?/);assert.match(session,/SELECT user,board,body FROM upload_sessions WHERE media_group=?/);
 assert.match(schemaSource,/posts_media_group_scope/);assert.match(schemaSource,/upload_sessions_media_group_scope/);assert.match(migration,/posts_media_group_scope/);assert.match(migration,/upload_sessions_media_group_scope/);
});


test('public viewer tokens keep NEW isolated and bridge into the board cursor',async()=>{
 const {call,publicActivityCall,anonymous,sql}=setup();
 const seeded=await call();const board=seeded.data.board;assert.ok(board);
 const first=await publicActivityCall();const second=await publicActivityCall();
 assert.equal(first.status,200);assert.equal(second.status,200);
 assert.match(first.data.viewerToken,/^v1[.][a-f0-9-]{36}[.][0-9]+[.][A-Za-z0-9_-]{43}$/);
 assert.match(second.data.viewerToken,/^v1[.][a-f0-9-]{36}[.][0-9]+[.][A-Za-z0-9_-]{43}$/);
 assert.notEqual(first.data.viewerToken,second.data.viewerToken);
 const subjectA=await anonymous.verifyPublicViewerToken(first.data.viewerToken);
 const subjectB=await anonymous.verifyPublicViewerToken(second.data.viewerToken);
 assert.ok(subjectA);assert.ok(subjectB);assert.notEqual(subjectA,subjectB);
 const baseline=Date.now()-2000;sql.prepare('INSERT INTO visits(subject,seen) VALUES(?,?)').run(subjectA,baseline);
 const author=crypto.randomUUID();sql.prepare('INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)').run(author,'viewer-test-author','Viewer test author',1,'user',baseline);
 const post=crypto.randomUUID();sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,NULL,NULL,NULL,NULL,NULL,'visible',0,?,?)").run(post,board,author,'Viewer-token test post',baseline+1,crypto.randomUUID());
 const ownAuthor=crypto.randomUUID();sql.prepare('INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)').run(ownAuthor,subjectA,'Viewer A',1,'user',baseline);
 const ownPost=crypto.randomUUID();sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,media_key,media_type,media_name,media_size,media_group,status,pinned,created,request) VALUES(?,?,?,NULL,?,NULL,NULL,NULL,NULL,NULL,NULL,'visible',0,?,?)").run(ownPost,board,ownAuthor,'Own post must not be unread',baseline+2,crypto.randomUUID());
 const unreadA=await publicActivityCall(first.data.viewerToken);const unreadB=await publicActivityCall(second.data.viewerToken);
 assert.equal(unreadA.data.unread,1);assert.equal(unreadB.data.unread,0);
 const bridged=await call(null,'','?board='+encodeURIComponent(board)+'&viewer='+encodeURIComponent(first.data.viewerToken));
 assert.equal(bridged.status,200);assert.equal(bridged.data.stats.unread,1);assert.match(bridged.headers.get('set-cookie')||'',/^__Host-lr_guest=v1[.]/);
 const tampered=await call({action:'seen',until:bridged.data.viewUntil},'','?viewer='+encodeURIComponent(first.data.viewerToken+'x'),'test@example.invalid','https://review.example','');
 assert.equal(tampered.status,200);
 assert.equal((await publicActivityCall(first.data.viewerToken)).data.unread,1);
 const seen=await call({action:'seen',until:bridged.data.viewUntil},'','?viewer='+encodeURIComponent(first.data.viewerToken),'test@example.invalid','https://review.example','');
 assert.equal(seen.status,200);
 assert.equal((await publicActivityCall(first.data.viewerToken)).data.unread,0);
});


test('successful own comments replies and media batches resync the same viewer unread cursor',()=>{
 assert.match(communitySource,/async function syncViewerSeen\(\)/);
 assert.match(communitySource,/fetch\(withViewerQuery\('\/api\/board'\)/);
 const publish=communitySource.slice(communitySource.indexOf('async function publish()'),communitySource.indexOf('async function retryPost'));
 assert.match(publish,/await syncViewerSeen\(\)/);
 const retry=communitySource.slice(communitySource.indexOf('async function retryPost'),communitySource.indexOf('const current='));
 assert.match(retry,/await syncViewerSeen\(\)/);
 const batch=communitySource.slice(communitySource.indexOf('function finishMediaBatch'),communitySource.indexOf('function applyLocalMediaPost'));
 assert.match(batch,/await syncViewerSeen\(\)/);
});

test('viewer token cannot override Owner auth but Owner seen still clears that viewer NEW only',async()=>{
 const {call,publicActivityCall,anonymous,sql}=setup();
 const seeded=await call();const board=seeded.data.board;assert.ok(board);
 const viewer=(await publicActivityCall()).data.viewerToken;assert.match(viewer,/^v1[.]/);const viewerSubject=await anonymous.verifyPublicViewerToken(viewer);assert.ok(viewerSubject);
 const owner=await anonymous.activateOwner('test-owner-access-token');assert.ok(owner);
 const result=await call(null,'','','owner@example.invalid','https://review.example',owner.setCookie||'');
 const bridged=await call(null,'','?board='+encodeURIComponent(board)+'&viewer='+encodeURIComponent(viewer),'owner@example.invalid','https://review.example',owner.setCookie||'');
 assert.equal(result.status,200);assert.equal(bridged.status,200);assert.equal(bridged.data.me?.role,'owner');assert.equal(bridged.data.me?.name,'LINEレンジャーは神ゲー');
 const author=crypto.randomUUID();const created=Date.now();sql.prepare('INSERT INTO users(id,subject,name,display_name_set,role,created) VALUES(?,?,?,?,?,?)').run(author,'owner-viewer-test-author','Other User',1,'user',created);
 sql.prepare('INSERT INTO visits(subject,seen) VALUES(?,?)').run(viewerSubject,1);
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,?,?,NULL,'visible',0,?,?)").run(crypto.randomUUID(),board,author,null,'Unread for Owner viewer',created,crypto.randomUUID());
 assert.equal((await publicActivityCall(viewer)).data.unread,1);
 const beforeSeenBoard=await call(null,'','?board='+encodeURIComponent(board)+'&viewer='+encodeURIComponent(viewer),'owner@example.invalid','https://review.example',owner.setCookie||'');assert.equal(beforeSeenBoard.data.stats.unread,1);
 const marked=await call({action:'seen',until:Date.now()},'','?viewer='+encodeURIComponent(viewer),'owner@example.invalid','https://review.example',owner.setCookie||'');assert.equal(marked.status,200);
 assert.equal((await publicActivityCall(viewer)).data.unread,0);
 const afterSeenBoard=await call(null,'','?board='+encodeURIComponent(board)+'&viewer='+encodeURIComponent(viewer),'owner@example.invalid','https://review.example',owner.setCookie||'');assert.equal(afterSeenBoard.data.stats.unread,0);
 assert.ok(Number(sql.prepare('SELECT seen FROM visits WHERE subject=?').get(viewerSubject)?.seen||0)>=created);
 assert.equal(sql.prepare('SELECT seen FROM visits WHERE subject=?').get('owner-subject'),undefined);
});



test('optimistic comment polling keeps an exact server cursor',()=>{
 assert.match(communitySource,/function updateLatestCursor\(id:string,created:number\)/);
 assert.match(communitySource,/if\(!nested\)updateLatestCursor\(savedId,local\.created\)/);
 assert.match(communitySource,/latestId:newest\?\.id\?\?latestId/);
});

test('Owner activation explicitly preserves the cookie and refreshes the role badge',()=>{
 assert.ok(communitySource.includes("credentials:'same-origin'"));
 assert.ok(communitySource.includes("setOwnerAccess(false);location.reload()"));
 assert.ok(communitySource.includes("data?.me?.role==='owner'"));
 assert.ok(communitySource.includes("t.owner"));
});


test('Owner display uses plain operator text without an icon',()=>{
 assert.match(labelsSource,/owner:'運営'/);
 assert.doesNotMatch(labelsSource,/owner:'🛡 運営'/);
});


test('reply pagination exposes every reply beyond 20 and the client follows nextAfter',async()=>{
 const {call,sql}=setup();await call({action:'profile',name:'Reply pager'});const state=(await call()).data;const rootPost=crypto.randomUUID();const start=Date.now();
 sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,?,?,NULL,'visible',0,?,?)").run(rootPost,state.board,state.me.id,null,'Root for reply pagination',start,crypto.randomUUID());
 const ids=[];for(let i=0;i<25;i++){const id=crypto.randomUUID();ids.push(id);sql.prepare("INSERT INTO posts(id,board,author,parent,body,video,status,pinned,created,request) VALUES(?,?,?,?,?,NULL,'visible',0,?,?)").run(id,state.board,state.me.id,rootPost,`reply-${i}`,start+i+1,crypto.randomUUID());}
 const first=await call(null,'test-a','?replies='+rootPost);assert.equal(first.status,200);assert.equal(first.data.posts.length,20);assert.ok(first.data.nextAfter);
 const second=await call(null,'test-a','?replies='+rootPost+'&replyAfter='+encodeURIComponent(first.data.nextAfter));assert.equal(second.status,200);assert.equal(second.data.posts.length,5);assert.equal(second.data.nextAfter,null);
 assert.deepEqual([...first.data.posts,...second.data.posts].map(post=>post.id),ids);
 assert.match(communitySource,/params\.set\('replyAfter',after\)/);assert.match(communitySource,/nextAfter:string\|null/);
});


test('Ranger detail API separates descriptions from effects and exposes safe skill icons',()=>{
 const basics=[{unitCode:'u1556e-af',unitNameCode:'u1556e-af_nm',grade:9,isTranscendentUnit:0,isHyperUnit:0,skillCode:'sk1555_af',skillCode2:'',skillCode3:'hsk1555_af',iconSkillCode2:'usk1555_af'}];
 const skills=[
  {skillCode:'sk1555_af',nameCode:'sk1555_af_nm',descriptionCode:'sk1555_af_desc',iconResourcePath:'skill_icon_sk1555_af.png'},
  {skillCode:'hsk1555_af',nameCode:'hsk1555_af_nm',descriptionCode:'hsk1555_af_desc',iconResourcePath:'skill_icon_hsk1555_af.png'},
  {skillCode:'usk1555_af',nameCode:'usk1555_af_nm',descriptionCode:'usk1555_af_desc',iconResourcePath:'../unsafe.png'},
 ];
 const translations={
  'ja:UNIT':{'u1556e-af_nm':'超能力者 アーニャ'},
  'ja:SKILL':{
   sk1555_af_nm:'わくわくっ！',sk1555_af_desc:'ペンギンのぬいぐるみと一緒に\\n楽しそうにアニメを見る。\\n\\n*味方のスキル範囲30%アップ (9秒)\\n*一部自軍のスキルクールタイムの初期化',
   hsk1555_af_nm:'星を摑む光の矢!',hsk1555_af_desc:'ボールを全力で投げる。\\n敵に悪い効果を与える。\\n\\n*敵の無敵スキル解除\\n*範囲内の敵2体に誘惑効果 (10秒)',
   usk1555_af_nm:'表示対象外',usk1555_af_desc:'icon code only',
  },
 };
 const parsed=rangerInfo.buildRangerInfo('u1556e-af',basics,skills,translations);
 assert.equal(parsed.language,'ja');
 assert.equal(parsed.name,'9★ 超能力者 アーニャ');
 assert.deepEqual(parsed.skills,[
  {
   name:'わくわくっ！',
   description:'ペンギンのぬいぐるみと一緒に\n楽しそうにアニメを見る。',
   effects:['味方のスキル範囲30%アップ (9秒)','一部自軍のスキルクールタイムの初期化'],
   iconUrl:'https://rangers.lerico.net/res/skill_icon/skill_icon_sk1555_af.png',
  },
  {
   name:'星を摑む光の矢!',
   description:'ボールを全力で投げる。\n敵に悪い効果を与える。',
   effects:['敵の無敵スキル解除','範囲内の敵2体に誘惑効果 (10秒)'],
   iconUrl:'https://rangers.lerico.net/res/skill_icon/skill_icon_hsk1555_af.png',
  },
 ]);
 assert.equal(parsed.sourceUrl,'https://rangers.lerico.net/ja/ranger/u1556e-af');
 assert.equal(rangerInfo.rangerDetailUrl('u1556e-af','zh'),'https://rangers.lerico.net/zh/ranger/u1556e-af');
 assert.equal(rangerInfo.rangerDetailUrl('u1556e-af','th'),'https://rangers.lerico.net/en/ranger/u1556e-af');
 assert.equal(rangerInfo.validRangerInfoLanguage('zh'),true);
 assert.equal(rangerInfo.validRangerInfoLanguage('th'),true);
 assert.equal(rangerInfo.rangerSkillIconUrl('../unsafe.png'),null);
 assert.deepEqual(rangerInfo.splitSkillDescription('説明だけです。'),{description:'説明だけです。',effects:[]});
 assert.throws(()=>rangerInfo.rangerDetailUrl('../bad'));
});


test('Ranger detail parser serves English names, descriptions, effects, and links without Japanese fallbacks',()=>{
 const basics=[{unitCode:'u1556e-af',unitNameCode:'u1556e-af_nm',grade:9,isTranscendentUnit:0,isHyperUnit:0,skillCode:'sk1555_af',skillCode2:'',skillCode3:'hsk1555_af'}];
 const skills=[
  {skillCode:'sk1555_af',nameCode:'sk1555_af_nm',descriptionCode:'sk1555_af_desc',iconResourcePath:'skill_icon_sk1555_af.png'},
  {skillCode:'hsk1555_af',nameCode:'hsk1555_af_nm',descriptionCode:'hsk1555_af_desc',iconResourcePath:'skill_icon_hsk1555_af.png'},
 ];
 const translations={
  'en:UNIT':{'u1556e-af_nm':'Esper Anya'},
  'en:SKILL':{
   sk1555_af_nm:'So Exciting!',sk1555_af_desc:'Watches anime with her penguin plush.\\n\\n*Increases allies skill range by 30% (9 sec)\\n*Resets some allied skill cooldowns',
   hsk1555_af_nm:'Starlight Arrow!',hsk1555_af_desc:'Throws the ball with all her strength.\\n\\n*Removes enemy invincibility skills\\n*Charms 2 enemies in range (10 sec)',
  },
 };
 const parsed=rangerInfo.buildRangerInfo('u1556e-af',basics,skills,translations,'en');
 assert.equal(parsed.language,'en');
 assert.equal(parsed.name,'9★ Esper Anya');
 assert.equal(parsed.sourceUrl,'https://rangers.lerico.net/en/ranger/u1556e-af');
 assert.equal(parsed.skills[0].name,'So Exciting!');
 assert.equal(parsed.skills[0].description,'Watches anime with her penguin plush.');
 assert.deepEqual(parsed.skills[0].effects,['Increases allies skill range by 30% (9 sec)','Resets some allied skill cooldowns']);
 assert.equal(parsed.skills[1].name,'Starlight Arrow!');
 assert.match(parsed.skills[1].description,/Throws the ball/);
 assert.ok(parsed.skills.flatMap(skill=>[skill.name,skill.description,...skill.effects]).every(text=>!/[ぁ-んァ-ヶ一-龠]/u.test(text)));
});

test('Ranger detail parser serves Chinese and Thai translation catalogs with isolated language keys',()=>{
 const basics=[{unitCode:'u1556e-af',unitNameCode:'u1556e-af_nm',grade:9,isTranscendentUnit:0,isHyperUnit:0,skillCode:'sk1555_af',skillCode2:'',skillCode3:''}];
 const skills=[{skillCode:'sk1555_af',nameCode:'sk1555_af_nm',descriptionCode:'sk1555_af_desc',iconResourcePath:'skill_icon_sk1555_af.png'}];
 const zhTranslations={'zh:UNIT':{'u1556e-af_nm':'超能力者安妮亞'},'zh:SKILL':{sk1555_af_nm:'太興奮了！',sk1555_af_desc:'和企鵝玩偶一起看動畫。\\n\\n*技能範圍增加30%（9秒）'}};
 const thTranslations={'th:UNIT':{'u1556e-af_nm':'เอสเปอร์ อาเนีย'},'th:SKILL':{sk1555_af_nm:'ตื่นเต้นมาก!',sk1555_af_desc:'ดูอนิเมะกับตุ๊กตาเพนกวิน\\n\\n*เพิ่มระยะสกิล 30% (9 วินาที)'}};
 const zh=rangerInfo.buildRangerInfo('u1556e-af',basics,skills,zhTranslations,'zh');
 const th=rangerInfo.buildRangerInfo('u1556e-af',basics,skills,thTranslations,'th');
 assert.equal(zh.language,'zh');
 assert.equal(zh.name,'9★ 超能力者安妮亞');
 assert.equal(zh.sourceUrl,'https://rangers.lerico.net/zh/ranger/u1556e-af');
 assert.equal(zh.skills[0].name,'太興奮了！');
 assert.deepEqual(zh.skills[0].effects,['技能範圍增加30%（9秒）']);
 assert.equal(th.language,'th');
 assert.equal(th.name,'9★ เอสเปอร์ อาเนีย');
 assert.equal(th.sourceUrl,'https://rangers.lerico.net/en/ranger/u1556e-af');
 assert.equal(th.skills[0].name,'ตื่นเต้นมาก!');
 assert.deepEqual(th.skills[0].effects,['เพิ่มระยะสกิล 30% (9 วินาที)']);
});

test('Ranger detail route isolates language catalogs and tolerates transient Handbook failures',()=>{
 assert.ok(rangerRouteSource.includes('validRangerInfoLanguage'));
 assert.ok(rangerRouteSource.includes("url.searchParams.get('lang')"));
 assert.ok(rangerRouteSource.includes('translationPath(language:RangerInfoLanguage)'));
 assert.ok(rangerRouteSource.includes('encodeURIComponent'));
 assert.ok(rangerRouteSource.includes('const upstreamRetryDelaysMs=[0,350] as const'));
 assert.ok(rangerRouteSource.includes('const upstreamCacheTtlSeconds=6*60*60'));
 assert.ok(rangerRouteSource.includes('cacheEverything:true'));
 assert.ok(rangerRouteSource.includes('cacheTtlByStatus'));
 assert.ok(rangerRouteSource.includes("'200-299':upstreamCacheTtlSeconds"));
 assert.ok(rangerRouteSource.includes("'400-499':0"));
 assert.ok(rangerRouteSource.includes("'500-599':0"));
 assert.ok(rangerRouteSource.includes('const staleCacheTtlMs=7*24*60*60*1000'));
 assert.ok(rangerRouteSource.includes("const durableCacheVersion='v1'"));
 assert.ok(rangerRouteSource.includes('caches.default.match'));
 assert.ok(rangerRouteSource.includes('caches.default.put'));
 assert.ok(rangerRouteSource.includes('readDurableResponseCache(request,unit,language)'));
 assert.ok(rangerRouteSource.includes('await writeDurableResponseCache(request,unit,language,info,refreshedAt)'));
 assert.ok(rangerRouteSource.includes('sharedRefreshPromise'));
 assert.ok(rangerRouteSource.includes('translationRefreshPromises'));
 assert.ok(rangerRouteSource.includes('ranger_catalog_stale_fallback'));
 assert.ok(rangerRouteSource.includes('ranger_translation_stale_fallback'));
 assert.ok(rangerRouteSource.includes('existing&&existing.staleUntil>Date.now()'));
 assert.ok(rangerRouteSource.includes('const cacheKey=\`\${language}:\${unit}\`'));
 assert.ok(rangerRouteSource.includes('parseRangerInfoData(catalog.basics,catalog.skills,catalog.translations,unit,language)'));
});

test('Ranger detail parser keeps partial cards when Handbook translations are missing',()=>{
 const basics=[{unitCode:'u1616e-brown',unitNameCode:'u1616e-brown_nm',grade:9,isTranscendentUnit:0,isHyperUnit:0,skillCode:'sk1615_brown',skillCode2:'',skillCode3:'hsk1615_brown'}];
 const skills=[
  {skillCode:'sk1615_brown',nameCode:'sk1615_brown_nm',descriptionCode:'sk1615_brown_desc',iconResourcePath:'skill_icon_sk1615_brown.png'},
  {skillCode:'hsk1615_brown',nameCode:'hsk1615_brown_nm',descriptionCode:'hsk1615_brown_desc',iconResourcePath:'skill_icon_hsk1615_brown.png'},
 ];
 const translations={
  'ja:UNIT':{'u1616e-brown_nm':'ゴールドクワガタブラウン'},
  'ja:SKILL':{
   hsk1615_brown_desc:'口に含んだゼリーを噴射して敵を攻撃し、悪い効果を与える。\\n\\n*敵の無敵スキル解除\\n*体力持続回復の解除',
  },
 };
 const parsed=rangerInfo.buildRangerInfo('u1616e-brown',basics,skills,translations);
 assert.equal(parsed.name,'9★ ゴールドクワガタブラウン');
 assert.deepEqual(parsed.skills,[
  {
   name:'スキル1',
   description:'取得元に説明情報が登録されていません。',
   effects:[],
   iconUrl:'https://rangers.lerico.net/res/skill_icon/skill_icon_sk1615_brown.png',
  },
  {
   name:'スキル2',
   description:'口に含んだゼリーを噴射して敵を攻撃し、悪い効果を与える。',
   effects:['敵の無敵スキル解除','体力持続回復の解除'],
   iconUrl:'https://rangers.lerico.net/res/skill_icon/skill_icon_hsk1615_brown.png',
  },
 ]);
});
