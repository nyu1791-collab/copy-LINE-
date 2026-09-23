# LINEレンジャー PvP統計＋新キャラ情報掲示板 確認版

このRepositoryは、**PvPランキングを主画面として復元し、同一サイトへ新キャラ情報掲示板を併設するOwner確認版**です。

## 現在の構成

- `/` : `/pvp/index.html` のPvPランキングを開く。
- `/pvp/index.html` : pre-maintenance版の画面構造・操作契約を基準に復元したランキング画面。
- `/boards` : 新キャラ情報掲示板。投票、コメント、写真/動画、翻訳、Owner/Moderator機能を扱う。
- PvP画面から同一サイトの `/boards` へ移動できる。
- 掲示板を主画面にしてPvPランキングを小型表示する旧方式へ戻さない。

## PvPファイルとデータ

- `public/pvp/index.html`
- `public/pvp/assets/style.css`
- `public/pvp/assets/app.js`
- `public/pvp/data/character_usage.json`
- `public/pvp/data/character_usage_history.json`
- `scripts/collect-pvp.mjs`
- `scripts/patch-pvp-metadata.mjs`
- `.github/workflows/refresh-pvp-data.yml`

PvP正本Repository `line-rangers-fan/line-rangers-pvp` はPrivateのまま読み取り専用とし、確認版BuildはPrivate raw/codeloadへ依存しません。確認版のcollectorが `rangers.lerico.net` の公開APIからLEGEND上位200人を取得し、**200/200の正常検証に成功した場合だけ**snapshotを生成します。部分/異常取得では正常snapshotを上書きしません。

workflowは毎時17分に更新し、ブラウザは同一originの追跡済みsnapshotを読みます。30〜90分前・前日/前週/前月のJST締めを正常な200/200履歴から選び、基準snapshotがない比較期間だけ「履歴待ち」と表示します。基準履歴にキャラがいなければ編成数は0として比較します。

## 新キャラの自動登録と監査

- 正常な200/200収集では、ランキングに初登場したキャラもID単位で全件集計する。Partialは比較履歴と新キャラ確定に使用しない。
- 公式Rangerカタログの新規究極進化キャラを検出する。初回カタログ取得では既存キャラを登録対象にせず基準だけ確立する。昔からあるキャラが初めてPvPに登場しても新発売キャラ扱いにしない。
- 公式の日本語・英語・中国語のキャラ名とスキル名・説明・アイコン、画像実体を確認し、3回連続の正常収集後に月別の独立した掲示板へ追加する。タイ語の取得元がない場合は英語fallbackを使う。未検証キャラを仮名・空のスキルで公開しない。
- 同じ月の掲示板はキャラごとに投稿・投票・動画を分離する。PvPランクがまだない新キャラも掲示板に登録でき、ランクイン後は順位を更新する。キャラ選択一覧は採用率と順位を使用する。
- `scripts/audit-community-release.mjs` はランキングの200/200、編成数、ID重複、掲示板の重複、3回の観測、スキル・画像を確認する。3体未満・5体超は警告とし、架空キャラの補完や正しい6体目の削除は行わない。掲示板取得が一時的に失敗してもPvP公開を妨げない。
- 本番Workerのコードは正本Repositoryの承認済みpromotion pinで固定する。生成済みキャラ設定の本番同期は、正本側でpin以降に変更されたファイルが所定の生成JSONだけであり、過去の掲示板を削除・改変せず監査を通る場合に限る。コード変更の自動昇格は行わない。

## 掲示板の重要仕様

- 2026-09の手動登録済み対象は `u1631e-sally` / `かに座 サリー` / 究極進化側。以降の月は検証済みの対象を順次追加する。
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
- `.github/workflows/refresh-pvp-data.yml` はPvP snapshotと検証済み掲示板設定を更新し、サイトDeployは行わない。

## Workへの正本指示

Owner Previewを作るときはRepository rootの `WORK_OWNER_PREVIEW_HANDOFF.md` を最優先で読み、**現在mainに追跡済みの `public/pvp/` を上書きせずそのままBuild**すること。
