import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {activeMonthAfterJstRollover,availableJstMonths} from '../lib/community-months.mjs';

test('a current-month view advances across a JST month boundary',()=>{
 assert.equal(activeMonthAfterJstRollover('2026-09','2026-09','2026-10'),'2026-10');
 assert.equal(activeMonthAfterJstRollover('2026-12','2026-12','2027-01'),'2027-01');
});

test('an explicitly selected archive remains selected across month rollover',()=>{
 assert.equal(activeMonthAfterJstRollover('2026-08','2026-09','2026-10'),'2026-08');
});

test('archive choices include all retained months, reject future or malformed values, and stay bounded',()=>{
 assert.deepEqual(availableJstMonths('2026-10',['2026-09','2026-08','2027-01','2026-13','bad']),['2026-10','2026-09','2026-08']);
 const months=Array.from({length:40},(_,index)=>'202'+Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0'));
 assert.equal(availableJstMonths('2026-12',months).length,41);
});

test('board UI exposes month archives and resynchronizes after a hidden tab returns',()=>{
 const ui=readFileSync(new URL('../app/community.tsx',import.meta.url),'utf8');
 assert.match(ui,/archive-selector/);
 assert.match(ui,/pageshow/);
 assert.match(ui,/visibilitychange/);
 assert.match(ui,/activeMonthAfterJstRollover/);
 assert.match(ui,/availableJstMonths/);
 assert.match(ui,/aria-label=\{t\.archive\}/);
});


test('automatic board topics require official metadata, a verified observation streak, and the canonical image',()=>{
 const rules=readFileSync(new URL('../lib/rules.ts',import.meta.url),'utf8');
 assert.match(rules,/topic\.source==='pvp-auto'/);
 assert.match(rules,/topic\.metadataSource!=='rangers\.lerico\.net\/api\/getRangersBasics'/);
 assert.match(rules,/Number\(topic\.observationCount\)<3/);
 assert.match(rules,/expectedImage='https:\/\/rangers\.lerico\.net\/res\/'\+topic\.id/);
 assert.match(rules,/return rateB-rateA\|\|ar-br/);
});

test('board API lists retained months and keeps archived boards read-only',()=>{
 const api=readFileSync(new URL('../app/api/board/route.ts',import.meta.url),'utf8');
 assert.match(api,/SELECT DISTINCT month FROM boards WHERE month<=\?/);
 assert.match(api,/availableMonths/);
 assert.match(api,/currentMonth:current/);
 assert.match(api,/board\.month!==monthJST\(\).*archive_readonly/);
 assert.doesNotMatch(api,/DELETE FROM boards/i);
});

test('an unvisited release month remains selectable and its verified topics are backfilled without replacing posts',()=>{
 const api=readFileSync(new URL('../app/api/board/route.ts',import.meta.url),'utf8');
 assert.match(api,/const confirmedTopics=confirmedCharactersForMonth\(requested\);\s*if\(confirmedTopics\.length\)/);
 assert.match(api,/INSERT OR IGNORE INTO boards\(id,month,character,name,name_en,image\)/);
 assert.match(api,/\.\.\.characters\.map\(topic=>topic\.releaseMonth\)/);
 assert.doesNotMatch(api,/DELETE FROM boards|DROP TABLE boards/i);
});

test('community discovery failure cannot suppress the PvP snapshot commit',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/refresh-pvp-data.yml',import.meta.url),'utf8');
 assert.match(workflow,/id: community_discovery\s+continue-on-error: true/);
 assert.match(workflow,/steps\.community_discovery\.outcome/);
 assert.match(workflow,/public\/pvp\/data\/character_usage\.json/);
});
