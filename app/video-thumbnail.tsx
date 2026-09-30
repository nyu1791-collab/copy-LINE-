import {Video} from 'lucide-react';
import {labels} from '@/lib/labels';
import type {Language} from '@/lib/rules';

type Props={name:string;lang:Language};

/**
 * Feed cards are a static poster placeholder. Video bytes are requested only
 * after the viewer opens the detail page, avoiding hidden range downloads for
 * every video card near the viewport.
 */
export default function VideoThumbnail({name,lang}:Props){
 const t=labels(lang);
 return <span className="video-thumbnail-shell"><span className="video-placeholder" aria-label={`${name} · ${t.playVideo}`}><Video size={34}/><span>{name}</span><small>{t.playVideo}</small></span></span>;
}
