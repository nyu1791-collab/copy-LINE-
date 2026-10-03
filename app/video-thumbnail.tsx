import {useEffect,useRef,useState} from 'react';
import {Video} from 'lucide-react';
import {labels} from '@/lib/labels';
import type {Language} from '@/lib/rules';

type Props={id:string;name:string;lang:Language};

/**
 * Real video thumbnails are warmed only when a feed card approaches the
 * viewport. This keeps off-screen videos idle while allowing existing uploads
 * to show an actual frame without a separate thumbnail-generation service.
 */
export default function VideoThumbnail({id,name,lang}:Props){
 const t=labels(lang);
 const shell=useRef<HTMLSpanElement>(null);
 const media=useRef<HTMLVideoElement>(null);
 const [active,setActive]=useState(false);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const node=shell.current;if(!node)return;
  if(typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'160px 0px'});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 function warmFirstFrame(){
  const video=media.current;if(!video)return;
  const duration=Number.isFinite(video.duration)?video.duration:0;
  const target=duration>.12?.08:0;
  try{if(target>0&&Math.abs(video.currentTime-target)>.01)video.currentTime=target;}catch{}
 }
 return <span ref={shell} className={'video-thumbnail-shell'+(ready?' is-ready':'')}>
  {active&&!failed&&<video ref={media} className="video-thumbnail-media" src={'/api/media?id='+encodeURIComponent(id)} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" disablePictureInPicture onLoadedMetadata={warmFirstFrame} onLoadedData={()=>setReady(true)} onSeeked={()=>setReady(true)} onError={()=>setFailed(true)}/>}
  <span className="video-placeholder" aria-label={`${name} · ${t.playVideo}`}><Video size={34}/><span>{name}</span><small>{t.playVideo}</small></span>
 </span>;
}
