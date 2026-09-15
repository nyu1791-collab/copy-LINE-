export default function Home() {
  return <main style={{position:'fixed',inset:0,background:'#07111f',overflow:'hidden'}}>
    <h1 style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}}>LINEレンジャー レジェンド帯キャラ集計</h1>
    <iframe
      src="/pvp/index.html"
      title="LINEレンジャー レジェンド帯キャラ集計＋新キャラ情報掲示板"
      style={{display:'block',width:'100%',height:'100dvh',border:0,background:'#07111f'}}
    />
  </main>;
}
