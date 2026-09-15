# LINEレンジャー PvP統計＋新キャラ情報掲示板 確認版

このRepositoryは、**元のLINEレンジャーPvPランキングサイトを主画面として忠実にコピーし、その同一サイトへ新キャラ情報掲示板を併設する確認版**です。

## 現在の正しい構成

- `/` : 元PvPランキングのコピー `/pvp/index.html` を開く。
- `/pvp/index.html` : `line-rangers-fan/line-rangers-pvp` の固定snapshot `517291dfa3f9eeaecd8b6c6f1d445da52f0480ac` の `docs/` を元にした忠実コピー。
- `/boards` : 新キャラ情報掲示板。投票、コメント、写真/動画、翻訳、Owner/Moderator機能を扱う。
- 元PvP画面から同一サイトの `/boards` へ移動できる導線を併設する。
- **掲示板を主画面にしてPvPランキングを小型表示する旧方式は禁止。**
- 元PvPを近似再制作せず、元の `index.html` / `style.css` / `app.js` をコピーして使用する。

## データと分離

- PvP正本は `line-rangers-fan/line-rangers-pvp`。確認版から正本データを書き換えない。
- 元PvP RepositoryはPrivate、GitHub Pagesは停止中。unauthenticated codeload/raw取得をBuildで行わない。
- Work Previewでは接続済みGitHub権限で固定snapshotを読み、必要ファイルを `public/pvp/` にmaterializeしてからBuildする。
- 掲示板障害でPvPランキングを停止させない。

## 掲示板の重要仕様

- 2026-09対象は `u1631e-sally` / `かに座 サリー` / 究極進化側のみ。
- コメントは投稿成功時だけ入力欄とlocalStorage draftを消し、失敗時は保持。
- Owner / Moderator / Userはサーバー側で判定し、表示名からRoleを付与しない。
- Secrets、Token、Cookie signing secret、Owner認証情報、DB/Storage credentialをCommitしない。
- noindex / nofollow / noarchive / nosnippetを維持する。

## Build / Test

- Node.js `>=22.13.0`
- `npm run install:ci`
- `npm run build`
- `npm test`
- `.github/workflows/verify-owner-copy.yml` はBuild/Test専用でDeployしない。

## Workへの正本指示

Previewを作るときは、必ずRepository rootの `WORK_OWNER_PREVIEW_HANDOFF.md` を最優先で読むこと。そこに元PvP完全コピー、掲示板併設、Preview検証条件を固定している。
