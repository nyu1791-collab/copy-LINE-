import OriginalPvpLauncher from './original-pvp-launcher';
export default function Home(){
 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#07111f',color:'#f4fbf8',fontFamily:'Arial,Helvetica,sans-serif',padding:24,textAlign:'center'}}>
  <div><h1 style={{fontSize:22,margin:'0 0 10px'}}>LINEレンジャー レジェンド帯キャラ集計</h1><p style={{color:'#a9bdca',margin:'0 0 16px'}}>元のPvPランキング＋新キャラ情報掲示板を読み込んでいます。</p><OriginalPvpLauncher /></div>
 </main>;
}
