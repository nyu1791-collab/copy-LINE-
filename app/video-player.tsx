'use client';
import {communityFetch as fetch, apiUrl} from '@/lib/community-client';

import {useState} from 'react';
import {RotateCcw,Video} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {labels} from '@/lib/labels';
import type {Language} from '@/lib/rules';

type Props={id:string;youtube:string|null;lang:Language;preloadMetadata?:boolean};

// The list never mounts a media element. This component exists only on the
// detail page, keeps native range seeking available, and has its own failure
// state so a bad media response cannot affect the surrounding comments.
export default function VideoPlayer({id,youtube,lang,preloadMetadata=false}:Props){
 const t=labels(lang);const [failed,setFailed]=useState(false);
 const [attempt,setAttempt]=useState(0);
 function reportFailure(){
  setFailed(true);
  void fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'video_playback',durationMs:0,success:false,errorType:'media_error'}),keepalive:true}).catch(()=>{});
 }
 if(youtube)return <iframe src={'https://www.youtube-nocookie.com/embed/'+youtube} title="YouTube video" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>;
 if(failed)return <div className="video-unavailable" role="alert"><Video size={24}/><p>{t.videoUnavailable}</p><Button variant="outline" onClick={()=>{setFailed(false);setAttempt(current=>current+1);}}><RotateCcw size={15}/>{t.retryVideo}</Button></div>;
 // Warm only the first detail video. Single-video posts become responsive
 // before the viewer taps play, while grouped posts still avoid preloading all
 // remaining clips and competing for mobile bandwidth.
 return <video crossOrigin="anonymous" key={id+':'+attempt} src={apiUrl('/api/media?id='+encodeURIComponent(id))} controls playsInline preload={preloadMetadata?'metadata':'none'} onError={reportFailure}/>;
}
