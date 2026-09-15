import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const build=readFileSync(new URL('scripts/build-verified.sh',root),'utf8');
const home=readFileSync(new URL('app/page.tsx',root),'utf8');
const launcher=readFileSync(new URL('app/original-pvp-launcher.tsx',root),'utf8');
const handoff=readFileSync(new URL('WORK_OWNER_PREVIEW_HANDOFF.md',root),'utf8');
const board=readFileSync(new URL('app/community.tsx',root),'utf8');
const sourceProxy=readFileSync(new URL('lib/pvp-source-proxy.ts',root),'utf8');
const draftGuard=readFileSync(new URL('app/comment-draft-success-guard.tsx',root),'utf8');
const pvpHtml=readFileSync(new URL('public/pvp/index.html',root),'utf8');
const pvpApp=readFileSync(new URL('public/pvp/assets/app.js',root),'utf8');

test('review build never uses unauthenticated private-repository codeload',()=>{
 assert.doesNotMatch(build,/sync-original-pvp\.sh/);
 assert.doesNotMatch(build,/codeload\.github\.com/);
 assert.match(build,/vinext.*build/s);
});

test('PvP ranking is the home and tracked assets are the Work build source',()=>{
 assert.match(home,/OriginalPvpLauncher/);
 assert.doesNotMatch(home,/<Community\s+boardPage/);
 assert.match(launcher,/\/pvp\/index\.html/);
 assert.match(handoff,/d6664b75502a73896b9d5b0c31667a2d4a0de95b/);
 assert.match(handoff,/public\/pvp\//);
 assert.match(handoff,/上書きしてはいけない/);
 assert.match(handoff,/\/boards/);
 assert.match(pvpHtml,/レジェンド帯 キャラ集計/);
 assert.match(pvpApp,/\.\/data\/character_usage\.json/);
});

test('board remains available and isolated from canonical PvP writes',()=>{
 assert.match(board,/u1631e-sally/);
 assert.match(sourceProxy,/raw\.githubusercontent\.com\/line-rangers-fan\/line-rangers-pvp\/main\/docs\/data/);
 assert.match(sourceProxy,/cache:'no-store'/);
 assert.doesNotMatch(sourceProxy,/method:\s*['"]POST['"]/);
 assert.match(board,/ランキングを取得できません。掲示板の投稿・投票はそのまま利用できます。/);
});

test('successful comment posts clear persisted drafts while failures preserve them',()=>{
 assert.match(draftGuard,/response\.ok/);
 assert.match(draftGuard,/action==='post'/);
 assert.match(draftGuard,/localStorage\.removeItem/);
 assert.doesNotMatch(draftGuard,/finally[\s\S]*removeItem/);
});
