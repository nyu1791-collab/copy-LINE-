import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const build=readFileSync(new URL('scripts/build-verified.sh',root),'utf8');
const home=readFileSync(new URL('app/page.tsx',root),'utf8');
const board=readFileSync(new URL('app/community.tsx',root),'utf8');
const sourceProxy=readFileSync(new URL('lib/pvp-source-proxy.ts',root),'utf8');
const draftGuard=readFileSync(new URL('app/comment-draft-success-guard.tsx',root),'utf8');

test('review build is independent from unauthenticated private-repository codeload',()=>{
 assert.doesNotMatch(build,/sync-original-pvp\.sh/);
 assert.doesNotMatch(build,/codeload\.github\.com/);
 assert.match(build,/vinext.*build/s);
});

test('the integrated new-character board is the review home and contains PvP ranking',()=>{
 assert.match(home,/Community/);
 assert.match(home,/boardPage/);
 assert.doesNotMatch(home,/OriginalPvpLauncher/);
 assert.match(board,/pvpRankingCard/);
 assert.match(board,/PvPランキング/);
 assert.match(board,/u1631e-sally/);
});

test('canonical PvP data access remains read-only and community failure is isolated',()=>{
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
