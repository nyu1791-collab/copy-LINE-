'use client';
import {useEffect,useMemo,useState} from 'react';
import {RotateCcw,X} from 'lucide-react';

type Period='hour'|'day'|'week'|'month';
type PeriodChange={comparable:boolean;rank:number;occurrenceCount:number;fromUpdatedAt:string;intervalMinutes:number};
type Change={new:boolean;rank:number;occurrenceCount:number;periods:Partial<Record<Period,PeriodChange>>}|null;
type EquipmentItem={itemCode:string;image:string;rank:number;occurrenceCount:number;playerCount:number;adoptionRate:number;change:Change};
type EquipmentGroup={equippedOccurrenceCount:number;equippedPlayerCount:number;items:EquipmentItem[]};
type Character={unitCode:string;name:string;image:string;rank:number;occurrenceCount:number;playerCount:number;adoptionRate:number;slotRate:number;change:Change;equipmentRankings:Partial<Record<'WEAPON'|'ARMOR'|'ACC',EquipmentGroup>>};
type RankingData={status:'fresh'|'partial'|'stale';source:'pvp_character_usage';league:string;updatedAt:string;targetPlayers:number;sampledPlayers:number;characterSlots:number;completeTarget:boolean;characters:Character[]};
const periodLabels:Record<Period,string>={hour:'1時間前',day:'前日締め',week:'先週締め',month:'先月締め'};
const equipmentLabels={WEAPON:'武器',ARMOR:'防具',ACC:'アクセサリー'} as const;

function deltaText(character:Character,period:Period){const row=character.change?.periods?.[period];if(!row?.comparable)return '比較なし';const value=row.occurrenceCount;return value===0?'±0':value>0?`+${value}`:String(value);}
function formatUpdated(value:string){if(!value)return '-';const date=new Date(value);if(Number.isNaN(date.getTime()))return '-';return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' JST';}

export default function PvpRanking(){
 const [data,setData]=useState<RankingData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[period,setPeriod]=useState<Period>('day'),[selected,setSelected]=useState<Character|null>(null),[reloadKey,setReloadKey]=useState(0);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void fetch('/api/ranking',{cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json() as RankingData&{error?:string};if(!response.ok)throw new Error(result.error||'unavailable');return result;}).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(()=>{if(!controller.signal.aborted)setError('ランキングデータを取得できませんでした。');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[reloadKey]);
 const rows=useMemo(()=>data?.characters||[],[data]);
 return <section className="pvp-ranking" aria-labelledby="ranking-title">
  <div className="ranking-summary">
   <div><p className="ranking-kicker">LEGEND TOP {data?.targetPlayers||200}</p><h2 id="ranking-title">キャラクターランキング</h2><p>元のPvP統計と同じ集計を、編成数が多い順に表示します。</p></div>
   <div className="ranking-health"><span className={data?.completeTarget?'health-ok':'health-warn'}>{data?.completeTarget?'正常更新':data?'一部更新':'読込中'}</span><small>最終更新 {formatUpdated(data?.updatedAt||'')}</small></div>
  </div>
  {data&&<div className="ranking-metrics"><span><small>リーグ</small><strong>{data.league}</strong></span><span><small>集計人数</small><strong>{data.sampledPlayers}/{data.targetPlayers}</strong></span><span><small>全編成キャラ数</small><strong>{data.characterSlots}</strong></span></div>}
  <div className="ranking-toolbar"><label>比較基準<select value={period} onChange={event=>setPeriod(event.target.value as Period)}>{(Object.keys(periodLabels) as Period[]).map(key=><option key={key} value={key}>{periodLabels[key]}</option>)}</select></label><span>選択した基準時点からの編成数増減</span></div>
  {loading&&<div className="ranking-message" role="status">集計データを読み込んでいます。</div>}
  {error&&<div className="ranking-message ranking-error" role="alert">{error}<button type="button" onClick={()=>setReloadKey(value=>value+1)}><RotateCcw size={15}/>再読込</button></div>}
  {!loading&&!error&&<div className="ranking-table-wrap"><table><caption className="sr-only">レジェンド帯キャラクター集計ランキング</caption><thead><tr><th>順位</th><th>キャラクター</th><th>編成数</th><th>採用人数</th><th>採用率</th></tr></thead><tbody>{rows.map(character=><tr key={character.unitCode} tabIndex={0} role="button" onClick={()=>setSelected(character)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(character);}}}><td className="rank-cell">{character.rank}</td><td><div className="character-cell">{character.image?<img src={character.image} alt="" loading="lazy" width="54" height="54"/>:<span className="image-pending">画像<br/>準備中</span>}<strong>{character.name}</strong></div></td><td><strong>{character.occurrenceCount}</strong><small className={deltaText(character,period).startsWith('+')?'delta-up':deltaText(character,period).startsWith('-')?'delta-down':'delta-flat'}>{deltaText(character,period)}</small></td><td>{character.playerCount}</td><td>{character.adoptionRate.toFixed(1)}%</td></tr>)}</tbody></table><p className="ranking-count">{rows.length}件</p></div>}
  {selected&&<div className="equipment-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)setSelected(null);}}><section className="equipment-panel" role="dialog" aria-modal="true" aria-labelledby="equipment-title"><button className="equipment-close" type="button" aria-label="閉じる" onClick={()=>setSelected(null)}><X/></button><div className="equipment-character">{selected.image&&<img src={selected.image} alt="" width="68" height="68"/>}<div><small>キャラクター装備ランキング</small><h3 id="equipment-title">{selected.name}</h3><p>キャラ使用人数 {selected.playerCount}人</p></div></div>{(['WEAPON','ARMOR','ACC'] as const).map(slot=>{const group=selected.equipmentRankings[slot];return <div className="equipment-group" key={slot}><h4>{equipmentLabels[slot]}</h4>{group?.items?.length?<div className="equipment-list">{group.items.map(item=><div className="equipment-item" key={slot+item.itemCode}>{item.image?<img src={item.image} alt="" loading="lazy" width="44" height="44"/>:<span className="equipment-placeholder"/>}<strong>{item.rank}位</strong><span>{item.occurrenceCount}個</span><span>{item.playerCount}人</span><span>{item.adoptionRate.toFixed(1)}%</span></div>)}</div>:<p className="equipment-empty">このカテゴリの装備データはありません。</p>}</div>})}</section></div>}
 </section>;
}
