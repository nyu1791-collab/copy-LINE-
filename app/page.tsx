/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's Workers output keeps same-origin navigation as native links. */
import CommunityTeaser from './community-teaser';
import PvpRanking from './pvp-ranking';

export default function Home() {
  return <main className="shell">
    <nav className="topbar">
      <a className="wordmark" href="/">LR <span>PVP STATISTICS</span></a>
      <a href="/boards" className="primary-link">新キャラ掲示板</a>
    </nav>
    <header className="intro">
      <p className="eyebrow">UNOFFICIAL STATISTICS</p>
      <h1>LINEレンジャー<br />レジェンド帯キャラ集計</h1>
      <p>レジェンド帯プレイヤーの防衛チームから、キャラクターの編成数と採用率を集計しています。</p>
      <p className="tap-hint">キャラクターをタップすると、装備ランキングが見れます。</p>
    </header>

    <section className="community-entry-home" aria-labelledby="community-entry-title">
      <h2 id="community-entry-title">新キャラ情報掲示板</h2>
      <p>新キャラの評価・ガチャ投票・コメント・写真・動画を、PvPランキングと同じサイトで確認できます。</p>
      <CommunityTeaser />
      <div className="community-entry-actions">
        <a href="/boards">コミュニティを見る</a>
        <span className="community-entry-note">掲示板に障害があってもPvPランキングは独立して表示します。</span>
      </div>
    </section>

    <PvpRanking />

    <section className="notes">
      <h2>集計方法</h2>
      <ul>
        <li>編成数は、各プレイヤーの防衛チームに編成されたキャラクターの総数です。</li>
        <li>同じプレイヤーが同一キャラクターを複数体使用した場合、編成数には使用された体数分を加算します。</li>
        <li>採用人数は、そのキャラクターを1体以上使用したプレイヤー数です。</li>
        <li>採用率は「採用人数 ÷ 集計人数」で計算します。</li>
        <li>比較は、選択した基準時点の正常集計を基準にしています。</li>
      </ul>
      <p>データ出典: <a href="https://rangers.lerico.net/ja/pvp-tracker" target="_blank" rel="noopener noreferrer">LINE Rangers Handbook PvP Tracker</a></p>
    </section>
    <footer>非公式・ファン作成の統計ページ</footer>
  </main>;
}
