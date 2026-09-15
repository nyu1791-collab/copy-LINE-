import {pvpSourceJson} from '@/lib/pvp-source-proxy';
export const dynamic='force-dynamic';
export async function GET(){return pvpSourceJson('character_usage_history.json',6*1024*1024);}
