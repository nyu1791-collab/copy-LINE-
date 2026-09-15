# ChatGPT Work — Owner専用確認版の最終反映指示

## 目的

このRepository `nyu1791-collab/copy-LINE-` の現在の `main` を、LINEレンジャー「新キャラ情報掲示板＋PvPランキング」のOwner確認版として扱う。

**一般公開は目的ではない。Owner本人がスマホ/iPadで完成画面と動作を確認できることが目的。**

## 正本と禁止事項

- 確認版コード: `nyu1791-collab/copy-LINE-`
- PvP正本: `line-rangers-fan/line-rangers-pvp`
- PvP正本はPrivate/maintenance状態を維持し、GitHub Pagesを再有効化しない。
- `copy-LINE-` のGitHub Pagesも有効化しない。
- 一般公開Worker、Production公開、PR Merge、Secrets変更、課金サービス開始はOwnerの明示承認なしに行わない。
- noindex、robots、推測困難URLだけをOwner認証の代用にしない。
- API key、PAT、Owner access token、Cookie signing secret、D1/R2 credential、個人情報をGitへCommitしない。

## 現在のUI正解

1. `/` は旧PvP統計画面から開始しない。
2. `/` と `/boards` は「新キャラ情報掲示板」を直接表示する。
3. 大きな「掲示板を開く」カードをPvP画面に置く旧方式へ戻さない。
4. 掲示板ページの中にPvPランキングを表示する。
5. 掲示板の投票・コメント・写真/動画投稿・Owner/Moderator管理は維持する。
6. PvP取得障害が掲示板の投稿/投票を停止させない。
7. PvP集計ロジック/正本データは確認版から書き換えない。

## キャラクター

2026-09の確認対象は正確に以下のみ。

- ID: `u1631e-sally`
- 名前: `かに座 サリー`
- 究極進化側

青色の別進化/超進化を代用・混同しない。

## コメント必須挙動

- 投稿成功がサーバーから確認された後だけ入力欄を空にする。
- 成功時はlocalStorage等の保存draftも削除する。
- 通信失敗、timeout、validation error、rate limit、server errorでは本文を残す。
- 送信中の二重押下を防ぐ。
- request ID/idempotencyで「保存済みだが応答喪失」の再送を重複コメントにしない。

## 権限

- Owner / Moderator / Userは必ずサーバー側で決定する。
- `運営`、`管理人`、`Owner`、`Moderator`等の表示名からRoleを与えない。
- Owner activation tokenはサーバー環境値だけに置き、ブラウザやRepositoryへ出さない。
- OwnerだけがModerator追加/解除可能。
- ModeratorはOwner変更・Role付与をできない。
- 称号/貢献バッジと権限Roleを別物として扱う。

## Owner専用URLを出す条件

Workで実際のPreviewを作成する場合、次を全部満たすこと。

1. Ownerだけが通れる実認証がある。
2. 未認証/別ユーザーでURLを開くと本体を閲覧できない。
3. noindex/nofollow/no-storeを防御層として追加する。
4. Preview DB/StorageはProductionと分離する。PvPはread-only。
5. 課金が必要なら実行せずOwnerへ停止報告する。
6. 一般公開しか選べない場合は公開せず停止する。

## 最終検証

OwnerへURLを渡す前に、Work自身で以下を確認する。

- URLが404/blank/old buildでない。
- `/` で掲示板が直接開く。
- `u1631e-sally` が正しい画像/名称/進化で表示される。
- PvPランキングが掲示板内にある。
- 投票が動く。
- コメント成功後に入力欄が空になる。
- コメント失敗時はdraftが残る。
- 二重送信が増殖しない。
- 一般UserがOwner/Moderatorを偽装できない。
- Owner本人にはOwner表示が出る。
- 写真/動画の上限・形式拒否・no autoplayが機能する。
- 320/375/390/430pxとiPad幅で横崩れがない。
- PvP取得失敗を模擬しても掲示板が使える。
- Secrets/Token/Cookie値がHTML/JS/API error/logへ漏れていない。
- GitHub Pagesを有効化していない。

## 現在のCI基準

`.github/workflows/verify-owner-copy.yml` の `verify` がSUCCESSのCommitだけを確認版候補にする。Build時にPrivateなPvP Repositoryをunauthenticated codeloadする旧処理へ戻さない。

## 最終報告形式

実認証付きOwner Previewの作成と実アクセス確認が完了してから、以下を先頭に返す。

```text
【Owner専用確認URL】
<実際にOwner認証を確認したURL>

【GitHub確認用Repository】
https://github.com/nyu1791-collab/copy-LINE-

【検証Commit】
<実際に確認したSHA>

【CI】
SUCCESS
```

その後に「実施内容」「実機/認証テスト結果」「残課題」を短く記載する。

**実際にOwnerだけが閲覧できるURLを確認していない段階では、Owner専用URLが完成したとは報告しない。**
