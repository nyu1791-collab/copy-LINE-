import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const route=readFileSync(new URL('../app/api/activity/route.ts',import.meta.url),'utf8');

test('public activity feed is explicitly scoped to the canonical ranking origin',()=>{
 assert.match(route,/publicActivityOrigin='https:\/\/line-rangers-fan\.github\.io'/);
 assert.match(route,/url\.searchParams\.get\('public'\)==='1'/);
 assert.match(route,/Access-Control-Allow-Origin/);
 assert.match(route,/Vary':'Origin/);
 assert.match(route,/public, max-age=15/);
});

test('public activity feed returns only teaser data while preserving likes-first ranking',()=>{
 assert.match(route,/return respond\(\{unread,videos:Number\(stats\.videos\|\|0\),comments:Number\(stats\.comments\|\|0\),featured,topics\}/);
 assert.match(route,/ORDER BY likes DESC,helpful DESC,p\.created DESC,p\.id DESC LIMIT 1/);
 assert.match(route,/if\(!publicMode\)\{/);
 assert.match(route,/sessionFromHeaders\(h\)/);
 assert.doesNotMatch(route,/BOARD_OWNER_ACCESS_TOKEN|BOARD_OWNER_SUBJECT/);
});
