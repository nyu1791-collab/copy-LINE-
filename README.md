# LINEレンジャー PvPランキング＋新キャラ情報掲示板（Owner確認用コードコピー）

このRepositoryは、元のLINEレンジャーPvPランキングをそのまま確認できる状態へ復元し、その同一サイトに「新キャラ情報掲示板」を併設するOwner確認用コードです。

## 現在の確認版仕様

- `/` : 元サイトの完全版へ自動で移動します。
- `/pvp/index.html` : 元Repository `line-rangers-fan/line-rangers-pvp` の最後の完全なランキングUI（commit `517291dfa3f9eeaecd8b6c6f1d445da52f0480ac`）をBuild時に丸ごとコピーし、メンテナンス表示だけをOwner確認用に解除します。
- 元ランキングのHTML/CSS/JS/キャラクター画像等は `scripts/sync-original-pvp.sh` が `public/pvp/` へ同期します。近似した別ランキングUIは使用しません。
- コピーした元ランキングの上部に「新キャラ情報掲示板」を併設し、同一サイトの `/boards` を開きます。
- `/boards` : 新キャラ情報掲示板。投票、コメント、写真・動画、翻訳、Owner/Moderator機能を扱います。
- PvPデータは元Repositoryの現行 `character_usage.json` / `character_usage_history.json` を同一Originの読み取り専用Proxyで参照します。掲示板用の別ランキング集計を作りません。
- 掲示板の障害はPvPランキングの正本データを変更・破壊しません。
- コメント本文は投稿成功時だけ消し、失敗時は端末のdraftを保持します。
- `u1631e-sally` は究極進化側の `crab-sally-ultimate-fallback.jpg` を使用し、青色の別進化を代用しません。
- Secrets、Token、Cookie、Owner情報、DB/R2認証情報はRepositoryへ含めません。
- `robots` は noindex / nofollow。Owner限定閲覧そのものはHosting側のアクセス制御で実施し、noindexを認証の代用にはしません。
- GitHub Pagesや一般公開用Production Deployは、このRepositoryの同期作業では行いません。

## Build / Test

- Node.js `>=22.13.0`
- `npm run install:ci` : lockfile固定の依存関係Install
- `npm run dev` : 開発Server
- `npm run build` : 元PvPサイトを同期してSites用Build
- `npm test` : Build＋回帰Test
- `npm run lint` : ESLint
- `.github/workflows/verify-owner-copy.yml` : Build/Test専用。Deploy処理は含みません。

Owner限定の実サイトURLを発行する作業はHosting側で行います。このRepositoryをPublicのまま使用する場合も、秘密情報や本番CredentialをCommitしないでください。
