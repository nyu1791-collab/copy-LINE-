import {database} from '@/db/raw';
import {logicalPostAnchorSql} from '@/lib/community-activity';
import {confirmedCharactersForMonth,monthJST} from '@/lib/rules';
import {abuseNetworkBucket,issuePublicViewerToken,sessionFromHeaders,verifyPublicViewerToken} from '@/lib/anonymous-session';
export const dynamic='force-dynamic';

const publicActivityOrigin='https://line-rangers-fan.github.io';
const publicActivityWorkerOrigin='https://line-rangers-pvp-community-production.n-yu1791.workers.dev';
const publicActivityOrigins=new Set([publicActivityOrigin,publicActivityWorkerOrigin]);
function isPublicActivityOrigin(origin:string|null){return origin!==null&&publicActivityOrigins.has(origin);}
function isPublicActivityRequest(publicMode:boolean,origin:string|null,url:URL){
 return publicMode&&(isPublicActivityOrigin(origin)||(origin===null&&url.origin===publicActivityWorkerOrigin));
}

function json(data:unknown,status=200,setCookie?:string,extraHeaders?:HeadersInit){
 const responseHeaders=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(extraHeaders||{})});
 if(setCookie)responseHeaders.set('Set-Cookie',setCookie);
 return Response.json(data,{status,headers:responseHeaders});
}

function publicResponseHeaders(origin:string|null){
 const headers:Record<string,string>={
  'Cache-Control':'no-store',
  'Vary':'Origin, X-LR-Viewer',
 };
 if(isPublicActivityOrigin(origin)){
  headers['Access-Control-Allow-Origin']=publicActivityOrigin;
  headers['Access-Control-Allow-Headers']='Accept, X-LR-Viewer';
  headers['Access-Control-Allow-Methods']='GET, OPTIONS';
 }
 return headers;
}
function withViewerToken(data:unknown,token:string|undefined){
 if(!token||!data||typeof data!=='object'||Array.isArray(data))return data;
 return {...data as Record<string,unknown>,viewerToken:token};
}
export async function OPTIONS(request:Request){
 const origin=request.headers.get('origin');
 if(origin!==publicActivityOrigin)return new Response(null,{status:403,headers:{'Cache-Control':'no-store','Vary':'Origin'}});
 return new Response(null,{status:204,headers:publicResponseHeaders(origin)});
}

export async function GET(request:Request){
 const url=new URL(request.url);
 const publicMode=url.searchParams.get('public')==='1';
 const origin=request.headers.get('origin');
 let viewerToken:string|undefined;
 const respond=(data:unknown,status=200,setCookie?:string)=>json(withViewerToken(data,viewerToken),status,setCookie,publicMode?publicResponseHeaders(origin):undefined);
 try{
  const h=request.headers;
  const network=await abuseNetworkBucket(h);
  const db=database();const now=Date.now();
  const limitKey=publicMode?'activity-public:':'activity-read:';
  const limitMax=publicMode?120:60;
  const admitted=network?await db.prepare('INSERT INTO limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END, until=CASE WHEN until<=? THEN excluded.until ELSE until END WHERE until<=? OR count<? RETURNING count').bind(limitKey+network,now+60000,now,now,now,limitMax).first():true;
  if(!admitted)return respond({error:'rate_limited'},429);

  let seen=0;let setCookie:string|undefined;
  if(isPublicActivityRequest(publicMode,origin,url)){
   const supplied=request.headers.get('x-lr-viewer')?.trim()||'';
   const verified=supplied.length<=256?await verifyPublicViewerToken(supplied):null;
   const subject=verified||crypto.randomUUID();
   viewerToken=verified?supplied:await issuePublicViewerToken(subject);
   seen=(await db.prepare('SELECT seen FROM visits WHERE subject=?').bind(subject).first<{seen:number}>())?.seen||0;
  }else if(!publicMode){
   const session=await sessionFromHeaders(h);
   setCookie=session.setCookie;
   seen=(await db.prepare('SELECT seen FROM visits WHERE subject=?').bind(session.sub).first<{seen:number}>())?.seen||0;
  }

  const currentMonth=monthJST();
  const confirmedTopics=confirmedCharactersForMonth(currentMonth);
  const topics=confirmedTopics.map(character=>({id:`${currentMonth}:${character.id}`,character:character.id,name:character.name,image:character.image,month:currentMonth}));
  const boardIds=topics.map(topic=>topic.id);
  if(!boardIds.length)return respond({unread:0,videos:0,comments:0,featured:null,topics:[]},200,setCookie);
  const slots=boardIds.map(()=>'?').join(',');

  // Count one logical root for a mixed upload. Replies remain individual text
  // posts, but two or more media rows sharing a group are never two NEW items.
  const unread=seen?(await db.prepare(`SELECT COUNT(*) count FROM posts p WHERE p.status='visible' AND p.created>? AND p.board IN (${slots}) AND ${logicalPostAnchorSql} AND (p.parent IS NULL OR EXISTS(SELECT 1 FROM posts parent WHERE parent.id=p.parent AND parent.status='visible'))`).bind(seen,...boardIds).first<{count:number}>())?.count||0:0;
  const stats=(await db.prepare(`SELECT COALESCE(SUM(CASE WHEN p.video IS NOT NULL OR p.media_type LIKE 'video/%' THEN 1 ELSE 0 END),0) videos,COALESCE(SUM(CASE WHEN ${logicalPostAnchorSql} THEN 1 ELSE 0 END),0) comments FROM posts p WHERE p.status='visible' AND p.board IN (${slots}) AND (p.parent IS NULL OR EXISTS(SELECT 1 FROM posts parent WHERE parent.id=p.parent AND parent.status='visible'))`).bind(...boardIds).first<{videos:number;comments:number}>())||{videos:0,comments:0};

  // The PvP landing-page teaser is driven by likes first. Helpful is a
  // tie-breaker, followed by recency for a deterministic result. Only public
  // post fields are returned; Owner/session state is never exposed here.
  const featured=await db.prepare(`SELECT p.id,p.board,p.body,CASE WHEN u.name='ゲスト' OR u.name LIKE 'ゲスト-%' THEN '匿名ユーザー' ELSE u.name END name,(SELECT COUNT(DISTINCT l.user) FROM likes l WHERE l.post=p.id OR (p.media_group IS NOT NULL AND l.post IN (SELECT g.id FROM posts g WHERE g.board=p.board AND g.author=p.author AND g.parent IS p.parent AND g.media_group=p.media_group AND g.status='visible'))) likes,(SELECT COUNT(DISTINCT h.user) FROM helpful h WHERE h.post=p.id OR (p.media_group IS NOT NULL AND h.post IN (SELECT g.id FROM posts g WHERE g.board=p.board AND g.author=p.author AND g.parent IS p.parent AND g.media_group=p.media_group AND g.status='visible'))) helpful FROM posts p JOIN users u ON u.id=p.author WHERE p.status='visible' AND p.parent IS NULL AND p.body<>'' AND p.board IN (${slots}) AND ${logicalPostAnchorSql} ORDER BY likes DESC,helpful DESC,p.created DESC,p.id DESC LIMIT 1`).bind(...boardIds).first();
  return respond({unread,videos:Number(stats.videos||0),comments:Number(stats.comments||0),featured,topics},200,setCookie);
 }catch{
  console.error('community_activity_unavailable');
  return respond({error:'unavailable'},503);
 }
}
