import {confirmedCharactersForMonth,monthJST,validMonth} from '@/lib/rules';

export const dynamic='force-dynamic';

// Public metadata only. Keep production publication checks independent of
// D1 users/visits/seen, R2 media and all community write endpoints.
export async function GET(request:Request){
 const month=new URL(request.url).searchParams.get('month')||monthJST();
 if(!validMonth(month)||month>monthJST())return Response.json({error:'invalid_request'},{status:400,headers:{'Cache-Control':'no-store'}});
 const characters=confirmedCharactersForMonth(month).map(topic=>({
  id:topic.id,name:topic.name,nameEn:topic.nameEn||null,nameZh:topic.nameZh||null,nameTh:topic.nameTh||null,
  pvpRank:topic.pvpRank??null,skillsVerified:topic.source==='pvp-auto'?topic.skillsVerified===true:null,
 }));
 return Response.json({month,characters},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
