import {pvpSourceJson} from '@/lib/pvp-source-proxy';
export const dynamic='force-dynamic';
export async function GET(){return pvpSourceJson('character_usage.json',2*1024*1024);}
