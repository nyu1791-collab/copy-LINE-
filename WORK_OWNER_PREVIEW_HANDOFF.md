# ChatGPT Work — PvPランキング＋掲示板 Owner確認版 最終Preview指示

## 最優先目的

`nyu1791-collab/copy-LINE-` の**現在のmainをそのままBuild**し、Owner確認用Previewで実機確認する。主画面はPvPランキング、`/boards` は新キャラ情報掲示板。掲示板を主画面へ戻さない。

## Source of Truth

- Build対象: `nyu1791-collab/copy-LINE-` の最新 `main`
- 元PvP正本: `line-rangers-fan/line-rangers-pvp` は読み取り専用で、変更・Pages再公開・Production反映をしない。
- 元画面のpre-maintenance視覚/操作基準: commit `d6664b75502a73896b9d5b0c31667a2d4a0de95b`
- **実際にBuildするPvPファイルは、すでに確認版Repositoryへ追跡済みの `public/pvp/`。WorkがPrivate正本から再コピーして上書きしてはいけない。**
- 掲示板: `/boards` / `app/community.tsx`

## 現在のPvP実装

- `/` → `/pvp/index.html`
- `public/pvp/index.html`
- `public/pvp/assets/style.css`
- `public/pvp/assets/app.js`
- `public/pvp/data/character_usage.json`
- `public/pvp/data/character_usage_history.json`
- `scripts/collect-pvp.mjs` が公開API `rangers.lerico.net` からLEGEND上位200人を取得し、200/200が検証できた場合だけsnapshotを生成する。
- `.github/workflows/refresh-pvp-data.yml` が毎時更新する。部分/異常取得時は失敗させ、正常snapshotを壊さない。
- BrowserはPrivate GitHub raw/Pagesへ接続せず、同一originの追跡済みsnapshotだけ読む。

## Workが行うこと

1. 最新mainを取得し、HEAD SHAを記録する。
2. `public/pvp/index.html`, `assets/style.css`, `assets/app.js`, `data/character_usage.json` の実在を確認する。
3. `character_usage.json` が `target_players=200`, `sampled_players=200`, `complete_target=true` であることを確認する。
4. `npm run install:ci` → `npm run build` → `npm test` を実行する。
5. Buildが成功したらOwner確認Previewを作る。
6. 実際のPreviewを開き、下記E2Eを最後まで確認する。
7. 実サイトを確認していないURL、推測URL、Repositoryに存在しないSHAは報告しない。

## PvP画面の必須条件

- `UNOFFICIAL STATISTICS`
- `レジェンド帯 キャラ集計`
- 言語切替
- リーグ / 全編成キャラ数 / 最終更新
- キャラクターランキング表
- 順位 / キャラクター / 編成数 / 採用人数 / 採用率
- `1時間前 / 前日締め / 先週締め / 先月締め`、初期値は前日締め
- キャラクタータップで武器・防具・アクセサリー装備ランキング
- 集計方法 / データ出典
- ダークネイビー＋緑、スマホ最優先
- `/boards` への「新キャラ情報掲示板」導線
- 比較履歴がまだ蓄積していない期間は、推測値を作らず「履歴待ち」と表示する。

## 新キャラ掲示板

- `/boards` を維持。
- 2026-09対象は `u1631e-sally` / `かに座 サリー` / 究極進化側のみ。
- 青色の別進化を混同しない。
- 投票、コメント、写真/動画、翻訳、並び順、固定/非表示/復元、Owner/Moderatorを維持。
- コメントは保存成功確認後だけ入力欄とlocalStorage draftを消す。失敗時はdraftを保持。
- request ID/idempotencyと二重送信防止を維持。

## 権限・Security

- Owner / Moderator / Userはサーバー側で決定。
- `運営` `管理人` `Owner` `Moderator` 等の表示名でRoleを与えない。
- OwnerだけがModerator追加/解除可能。
- Secret/PAT/Owner token/Cookie signing secret/DB・Storage credentialをCommitしない。
- noindex/nofollow/noarchive/nosnippetを維持。
- PreviewはOwner確認用。一般公開URLで代用しない。

## 禁止

- `public/pvp/` をPrivate正本から再materializeして上書きすること。
- unauthenticated codeload/raw取得をBuildへ戻すこと。
- 掲示板を主画面にしてPvPを小型カード化すること。
- 元PvP Repositoryのmain/Pages/Productionを変更すること。
- copy RepositoryのGitHub Pagesを有効化すること。
- PR Merge、Production Publish、一般公開Worker、課金開始。

## URL返却前のE2E

1. `/` でPvPランキングが最初に表示される。
2. maintenance画面や404にならない。
3. 200/200のsnapshotからランキングが表示される。
4. 前日締めが初期選択で、4期間を切替できる。
5. キャラタップで装備ランキングが開き、装備画像が表示される。
6. `/boards` へ移動でき、戻ってPvPも再表示できる。
7. 掲示板で投票・コメントが使える。
8. コメント成功後は入力欄が空、失敗時はdraft保持。
9. 掲示板の `u1631e-sally` は `かに座 サリー` / 究極進化画像。
10. 320/375/390/430pxとiPad幅で致命的な横崩れがない。
11. 一般UserがOwner/Moderatorを偽装できない。
12. Secrets/Token/Cookie値がHTML/JS/API error/logに出ない。

最終報告は、**実際に開いて確認したOwner Previewの `chatgpt.site` URL、実在HEAD SHA、Build/Test結果、E2E結果**だけを返す。不具合があればURLを完成品扱いせず、修正→再Build→再確認する。
