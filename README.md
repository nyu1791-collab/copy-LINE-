# LINEレンジャー PvPランキング＋新キャラ情報掲示板（Owner確認用コードコピー）

このRepositoryは、元のLINEレンジャーPvPランキングを主画面として維持し、その同一サイトに「新キャラ情報掲示板」を併設するOwner確認用のコードコピーです。

## 現在の確認版仕様

- `/` : 元の「レジェンド帯キャラ集計」を主画面として表示し、新キャラ情報掲示板への入口・注目コメント・未読情報を併設します。
- `/boards` : 新キャラ情報掲示板。投票、コメント、写真・動画、翻訳、Owner/Moderator機能を扱います。
- PvPランキングは `line-rangers-fan/line-rangers-pvp` が公開している既存 `character_usage.json` を読み取り専用のSource of Truthとして使用し、掲示板用の別ランキング集計を作りません。
- 掲示板の障害はPvPランキングの正本データを変更・破壊しません。
- コメント本文は投稿成功時だけ消し、失敗時は端末のdraftを保持します。
- Secrets、Token、Cookie、Owner情報、DB/R2認証情報はRepositoryへ含めません。
- `robots` は noindex / nofollow。Owner限定閲覧そのものはHosting側のアクセス制御で実施し、noindexを認証の代用にはしません。
- GitHub Pagesや一般公開用Production Deployは、このRepositoryの同期作業では行いません。

## 重要

このRepository自体はコード確認用です。Owner限定サイトの閲覧制御はChatGPT Sites / Hosting側で設定してください。RepositoryをPublicのまま使用する場合、秘密情報や本番CredentialをCommitしないでください。

## 開発

- Node.js `>=22.13.0`
- `npm run install:ci` : lockfile固定の依存関係Install
- `npm run dev` : 開発Server
- `npm run build` : Sites用Build
- `npm test` : Build＋回帰Test
- `npm run lint` : ESLint

主要実装は `app/`、APIは `app/api/`、DB schemaは `db/`、回帰Testは `tests/` にあります。
