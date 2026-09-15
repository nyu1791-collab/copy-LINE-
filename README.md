# LINEレンジャー 新キャラ情報掲示板＋PvP確認版

このRepositoryは、作成中の「新キャラ情報掲示板」をスマホ/iPadで確認しながら、既存PvP集計の情報も同じ画面で確認するための検証用コードです。

## 現在の確認版仕様

- `/` : **新キャラ情報掲示板を直接表示**します。旧PvP画面へ自動転送しません。
- `/boards` : 同じ新キャラ情報掲示板。投票、コメント、写真・動画、翻訳、Owner/Moderator機能を扱います。
- 掲示板内にPvPランキング情報を表示します。掲示板障害とPvP正本は別のfailure domainです。
- PvPの正本は `line-rangers-fan/line-rangers-pvp`。このRepositoryから正本データを書き換えません。
- 元PvP RepositoryはPrivate、GitHub Pagesは停止中のため、Build時にunauthenticated codeload/raw取得は行いません。これによりPrivate Repositoryの正常な404でBuild全体が失敗する問題を回避しています。
- PvP取得に失敗しても掲示板の投稿・投票・閲覧は継続します。
- コメント本文は**投稿成功時だけ**消し、失敗時は端末draftを保持します。成功したPOSTは互換guardでもlocalStorage draftを即時削除します。
- `u1631e-sally` は `かに座 サリー` の究極進化側だけを対象とし、別進化を混同しません。
- RoleはOwner / Moderator / Userをサーバー側で判定し、表示名から権限を付与しません。
- Secrets、Token、Cookie、Owner認証情報、DB/R2認証情報はRepositoryへCommitしません。
- `robots` は noindex / nofollow。RepositoryがPublicでも秘密情報は置きません。

## Build / Test

- Node.js `>=22.13.0`
- `npm run install:ci` : 依存関係Install
- `npm run dev` : 開発Server
- `npm run build` : Sites用Build
- `npm test` : Build＋回帰Test
- `npm run lint` : ESLint
- `.github/workflows/verify-owner-copy.yml` : Build/Test専用。Deploy処理は含みません。

## 重要

`line-rangers-fan/line-rangers-pvp` の本番Repository、GitHub Pages、Production Deploy、Secretsはこの確認版から変更しません。公開確認用RepositoryにはCredentialや個人情報を置かないでください。
