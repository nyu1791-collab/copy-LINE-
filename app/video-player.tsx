'use client';

import {useState} from 'react';
import {RotateCcw,Video} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {labels} from '@/lib/labels';
import type {Language} from '@/lib/rules';

type Props={id:string;youtube:string|null;lang:Language};

// The list never mounts a media element. This component exists only on the
// detail page, keeps native range seeking available, and has its own failure
// state so a bad media response cannot affect the surrounding comments.
export default function VideoPlayer({id,youtube,lang}:Props){
 const t=labels(lang);const [failed,setFailed]=useState(false);
 const [attempt,setAttempt]=useState(0);
 function reportFailure(){
  setFailed(true);
  void fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'video_playback',durationMs:0,success:false,errorType:'media_error'}),keepalive:true}).catch(()=>{});
 }
 if(youtube)return <iframe src={'https://www.youtube-nocookie.com/embed/'+youtube} title="YouTube video" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>;
 if(failed)return <div className="video-unavailable" role="alert"><Video size={24}/><p>{t.videoUnavailable}</p><Button variant="outline" onClick={()=>{setFailed(false);setAttempt(current=>current+1);}}><RotateCcw size={15}/>{t.retryVideo}</Button></div>;
 // Group detail pages can contain several videos. `none` prevents every
 // player from starting its own range request before the viewer chooses one.
 // Once play is pressed, the media route streams the requested range directly.
 return <video key={id+':'+attempt} src={'/api/media?id='+encodeURIComponent(id)} controls playsInline preload="none" onError={reportFailure}/>;
}
