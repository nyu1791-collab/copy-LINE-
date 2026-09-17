import { bucket,database } from '@/db/raw';
import {boundedMediaRange,mediaRange} from '@/lib/media-range';
import {videoInitialRangeBytes} from '@/lib/rules';
import {abuseNetworkBucket} from '@/lib/anonymous-session';
import {enforceLimit} from '@/lib/upload-session';
export const dynamic='force-dynamic';
type Media={media_key:string;media_type:string;media_size:number};
// Explicit browser byte ranges may be larger than the conservative first
// response. Four initial windows (16 MiB today) substantially reduce round
// trips without ever allowing one request to stream a full 200 MiB video.
const videoRequestedRangeBytes=videoInitialRangeBytes*4;
export async function GET(request:Request){try{
 const network=await abuseNetworkBucket(request.headers);if(network)await enforceLimit('media-read:'+network,600,60);
 const id=new URL(request.url).searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:'not_found'},{status:404});
 const media=await database().prepare("SELECT p.media_key,p.media_type,p.media_size FROM posts p WHERE p.id=? AND p.status='visible' AND p.media_key IS NOT NULL AND (p.parent IS NULL OR EXISTS(SELECT 1 FROM posts parent WHERE parent.id=p.parent AND parent.status='visible'))").bind(id).first<Media>();if(!media)return Response.json({error:'not_found'},{status:404});
 let range;try{
  const rangeHeader=request.headers.get('range');
  range=media.media_type.startsWith('video/')
   ?boundedMediaRange(rangeHeader,media.media_size,videoInitialRangeBytes,videoRequestedRangeBytes)
   :mediaRange(rangeHeader,media.media_size);
 }catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${media.media_size}`,'Cache-Control':'no-store'}});}
 const object=await bucket().get(media.media_key,range?{range:{offset:range.start,length:range.end-range.start+1}}:undefined);if(!object)return Response.json({error:'not_found'},{status:404});
 // Native video players make several byte-range requests while starting and
 // seeking. Keep viewer responses browser-private, but reusable locally. The
 // larger bounded explicit range above reduces repeat Worker/D1/R2 trips.
 const cacheControl=media.media_type.startsWith('video/')?'private, max-age=600, stale-while-revalidate=120':'private, max-age=300, stale-while-revalidate=60';
 const length=range?range.end-range.start+1:media.media_size;return new Response(object.body,{status:range?206:200,headers:{'Content-Type':media.media_type,'Content-Length':String(length),'Content-Disposition':'inline','Accept-Ranges':'bytes','Cache-Control':cacheControl,'Cross-Origin-Resource-Policy':'same-origin','X-Content-Type-Options':'nosniff',...(range?{'Content-Range':`bytes ${range.start}-${range.end}/${media.media_size}`}:{})}});
 }catch(e){if(e instanceof Error&&e.message==='rate_limited')return new Response(null,{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60','X-Content-Type-Options':'nosniff'}});if(e instanceof Error&&e.message==='range')return new Response(null,{status:416,headers:{'Content-Range':'bytes */0','X-Content-Type-Options':'nosniff'}});console.error('media_read_failed');return Response.json({error:'unavailable'},{status:503});}}
