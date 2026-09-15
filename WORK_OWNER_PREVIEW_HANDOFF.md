# ChatGPT Work — 元PvP完全コピー＋掲示板併設 Owner確認版

## 最優先目的

`nyu1791-collab/copy-LINE-` を、**元のPvPランキングサイトを忠実にコピーした画面を主画面**として完成させ、その同一サイト内へ新キャラ情報掲示板を併設する。

前回の「掲示板を主画面にしてPvPを小さく内包する」構成は誤り。絶対に再利用しない。

## Source of Truth

- 確認版Repository: `nyu1791-collab/copy-LINE-`
- 元PvP Repository: `line-rangers-fan/line-rangers-pvp`
- 元PvP画面の固定Source snapshot: `517291dfa3f9eeaecd8b6c6f1d445da52f0480ac`
- 元画面の中心ファイル: `docs/index.html`, `docs/assets/style.css`, `docs/assets/app.js`
- 新キャラ掲示板: 確認版の既存 `/boards` と `app/community.tsx`

現在の元PvP `main` のmaintenance-only shellを画面コピー元にしない。見た目・ランキング・比較UI・装備Dialogが残っている上記snapshotを使用する。

## Workが最初に行うこと

1. GitHub接続済み権限で `line-rangers-fan/line-rangers-pvp@517291...` を直接読み取る。
2. `docs/` の実ファイルを確認版の `public/pvp/` へコピーする。unauthenticated codeload/raw URLでPrivate Repositoryを取得しない。
3. コピー先だけでmaintenance表示を解除する。元Repositoryは変更しない。
4. コピー先だけで `frame-ancestors 'none'` 等Previewを妨げる設定を必要最小限調整する。
5. 元ランキングのDOM/CSS/JSを作り直さない・近似実装しない。**元ファイルをコピーして使う。**
6. `/` は `/pvp/index.html` の元PvP画面を開く。
7. 元PvP画面に掲示板への同一サイト導線 `/boards` を併設する。ランキングそのものを掲示板に置き換えない。

## 完成画面の必須条件

主画面は元サイトと同じ以下を保持する。

- `UNOFFICIAL STATISTICS`
- `レジェンド帯 キャラ集計`
- 言語切替
- リーグ / 全編成キャラ数 / 最終更新
- キャラクターランキング表
- 順位 / キャラクター / 編成数 / 採用人数 / 採用率
- 比較基準 `1時間前 / 前日締め / 先週締め / 先月締め`、初期値は `前日締め`
- キャラクタータップ時の武器・防具・アクセサリー装備ランキング
- 集計方法とデータ出典
- 元サイトのダークネイビー＋緑、スマホ表示

その上で、同じサイトから `/boards` の「新キャラ情報掲示板」へ自然に移動できる導線を追加する。掲示板カードや導線は元ランキングを隠したり置換したりしない。

## PvPデータ

- 正本の集計ロジックを書き換えない。
- 既存 `character_usage.json` / history と元 `app.js` の契約を維持する。
- Private正本をブラウザから直接raw取得させない。
- Previewで必要なread-only snapshot/dataをWorkの認証済み取得で `public/pvp/data/` に含めるか、既存の安全なread-only routeへ同一originで接続する。
- 異常/空データで正常データを上書きしない。
- 掲示板障害でPvPランキングを停止させない。

## 新キャラ掲示板

- `/boards` を維持。
- 2026-09対象は `u1631e-sally` / `かに座 サリー` / 究極進化側のみ。
- 青色の別進化を混同しない。
- 投票、コメント、写真/動画、翻訳、並び順、固定/非表示/復元、Owner/Moderatorを維持。
- コメントは保存成功確認後だけ入力欄とlocalStorage draftを消す。失敗時はdraftを保持。
- 二重送信を防止しrequest ID/idempotencyを維持。

## 権限・Security

- Owner / Moderator / Userはサーバー側で決定。
- `運営` `管理人` `Owner` `Moderator` 等の表示名でRoleを与えない。
- OwnerだけがModerator追加/解除可能。
- Secret/PAT/Owner token/Cookie signing secret/DB・Storage credentialをCommitしない。
- noindex/nofollow/noarchive/nosnippetを維持。

## 禁止

- 掲示板を主画面にしてPvPランキングを小型カード化すること。
- 元PvPをReact等で近似再制作すること。
- 元PvP Repositoryのmain/Pages/Productionを変更すること。
- GitHub Pagesを有効化すること。
- PR Merge、Production Publish、一般公開Worker、課金開始。
- Private Repositoryをunauthenticated codeloadして404になる旧処理へ戻すこと。

## Preview作成と最終検証

Build前に `public/pvp/index.html`, `public/pvp/assets/style.css`, `public/pvp/assets/app.js` が実在し、元snapshot由来であることを確認する。存在しない場合はPreviewを成功扱いしない。

URLを返す前にWork自身で実サイトを開き、以下を確認する。

1. `/` を開くと元PvPランキング画面が最初に見える。
2. maintenance画面や掲示板単体画面から始まらない。
3. ランキング表が元サイト同様に表示される。
4. 前日締めが初期選択され、4比較期間を切替できる。
5. キャラタップで装備ランキングが開く。
6. 同一サイトの掲示板導線から `/boards` へ移動できる。
7. `/boards` で投票・コメントが使える。
8. コメント成功後は入力欄が空、失敗時はdraft保持。
9. `u1631e-sally` の名前・画像・進化が正しい。
10. 320/375/390/430pxとiPad幅で横崩れしない。
11. 一般UserがOwner/Moderatorを偽装できない。
12. Secrets/Token/Cookie値がHTML/JS/API error/logに出ない。

## 重要な照合

Workが報告する「検証Commit」は、必ず `nyu1791-collab/copy-LINE-` の実在Commitと照合する。Repositoryに存在しないSHAを検証Commitとして報告しない。

最終報告は、実際に開いて上記を確認した `chatgpt.site` URL、実在するGitHub Commit SHA、CI結果を返す。画面が元PvPと一致しない場合はURLを完成品として返さず、修正→再Build→再確認を続ける。
