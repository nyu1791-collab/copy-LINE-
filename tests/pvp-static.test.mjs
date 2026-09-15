import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('root still launches the restored PvP surface',async()=>{
  const [page,launcher]=await Promise.all([read('app/page.tsx'),read('app/original-pvp-launcher.tsx')]);
  assert.match(page,/OriginalPvpLauncher/);
  assert.match(launcher,/\/pvp\/index\.html/);
});

test('static PvP surface exists and keeps community co-located',async()=>{
  const html=await read('public/pvp/index.html');
  assert.match(html,/UNOFFICIAL STATISTICS/);
  assert.match(html,/レジェンド帯 キャラ集計/);
  assert.match(html,/id="summary" class="summary-grid"/);
  assert.match(html,/id="ranking-body"/);
  assert.match(html,/id="equipment-dialog"/);
  assert.match(html,/data-rank-period="hour"/);
  assert.match(html,/data-rank-period="day"/);
  assert.match(html,/data-rank-period="week"/);
  assert.match(html,/data-rank-period="month"/);
  assert.match(html,/href="\/boards"/);
  assert.match(html,/コミュニティを見る/);
  assert.match(html,/u1631e-sally/);
  assert.match(html,/かに座 サリー/);
  assert.match(html,/究極進化/);
  assert.match(html,/original-compat\.css/);
  assert.match(html,/noindex,nofollow,noarchive,nosnippet/);
});

test('ranking interaction keeps the original image-first table contract',async()=>{
  const [js,css]=await Promise.all([read('public/pvp/assets/app.js'),read('public/pvp/assets/original-compat.css')]);
  assert.match(js,/className = "character-button"/);
  assert.match(js,/className = "rank-number"/);
  assert.match(js,/className = "rate-track"/);
  assert.match(js,/className = "rate-bar"/);
  assert.match(js,/showModal\(\)/);
  assert.match(css,/\.character-button/);
  assert.match(css,/\.character-image-frame/);
  assert.match(css,/\.rank-period-changes/);
  assert.match(css,/\.equipment-tabs/);
  assert.match(css,/@media\(max-width:720px\)/);
});

test('ranking browser reads only the local validated snapshot',async()=>{
  const js=await read('public/pvp/assets/app.js');
  assert.match(js,/\.\/data\/character_usage\.json/);
  assert.match(js,/equipment_rankings/);
  assert.match(js,/WEAPON/);
  assert.match(js,/ARMOR/);
  assert.match(js,/ACC/);
  assert.match(js,/TARGET_PLAYERS = 200/);
  assert.match(js,/complete_target !== true/);
  assert.doesNotMatch(js,/raw\.githubusercontent\.com/);
  assert.doesNotMatch(js,/line-rangers-fan\.github\.io/);
});

test('collector fails closed unless all 200 Legend players validate',async()=>{
  const [collector,workflow]=await Promise.all([read('scripts/collect-pvp.mjs'),read('.github/workflows/refresh-pvp-data.yml')]);
  assert.match(collector,/const TARGET=200/);
  assert.match(collector,/api\/v2\/pvp\/league\/rank\/LEGEND/);
  assert.match(collector,/api\/getPlayer/);
  assert.match(collector,/refusing partial ranking/);
  assert.match(collector,/refusing incomplete player details/);
  assert.match(collector,/public\/pvp\/data\/character_usage\.json/);
  assert.match(workflow,/cron: '17 \* \* \* \*'/);
  assert.match(workflow,/permissions:\n  contents: write/);
  assert.match(workflow,/git add public\/pvp\/data\/character_usage\.json public\/pvp\/data\/character_usage_history\.json/);
  assert.match(workflow,/git diff --cached --quiet/);
});
