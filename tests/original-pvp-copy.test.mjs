import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const sync=readFileSync(new URL('scripts/sync-original-pvp.sh',root),'utf8');
const home=readFileSync(new URL('app/page.tsx',root),'utf8');
const launcher=readFileSync(new URL('app/original-pvp-launcher.tsx',root),'utf8');
const sourceProxy=readFileSync(new URL('lib/pvp-source-proxy.ts',root),'utf8');

test('Owner review build copies the last complete original PvP UI, not the maintenance-only shell',()=>{
 assert.match(sync,/517291dfa3f9eeaecd8b6c6f1d445da52f0480ac/);
 assert.match(sync,/SOURCE_REPO="line-rangers-fan\/line-rangers-pvp"/);
 assert.match(sync,/maintenance-mode/);
 assert.match(sync,/maintenance-screen/);
 assert.ok(sync.includes('id="ranking-section"'));
});

test('the copied ranking gets a same-site community board entry without replacing ranking markup',()=>{
 assert.ok(sync.includes('href="/boards"'));
 assert.match(sync,/新キャラ情報掲示板/);
 assert.match(sync,/u1631e-sally/);
 assert.match(sync,/crab-sally-ultimate-fallback\.jpg/);
 assert.ok(sync.includes('target="_top"'));
});

test('home opens the exact static copy and canonical ranking data stays read-only upstream',()=>{
 assert.match(home,/OriginalPvpLauncher/);
 assert.match(launcher,/window\.location\.replace\('\/pvp\/index\.html'\)/);
 assert.match(sourceProxy,/raw\.githubusercontent\.com\/line-rangers-fan\/line-rangers-pvp\/main\/docs\/data/);
 assert.match(sourceProxy,/cache:'no-store'/);
 assert.doesNotMatch(sourceProxy,/method:\s*['"]POST['"]/);
});
