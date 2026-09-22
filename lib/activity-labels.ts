import type {Language} from './rules';
const copy={
 ja:{helpful:'役に立った',helpers:'役に立ったを押した人',sort:'役に立った順',featured:'注目コメント',title:'動画投稿者'},
 en:{helpful:'Helpful',helpers:'People who found this helpful',sort:'Most helpful',featured:'Featured comment',title:'Video contributor'},
 zh:{helpful:'有幫助',helpers:'認為有幫助的人',sort:'最有幫助',featured:'精選留言',title:'影片貢獻者'},
 th:{helpful:'มีประโยชน์',helpers:'ผู้ที่เห็นว่ามีประโยชน์',sort:'มีประโยชน์มากที่สุด',featured:'ความคิดเห็นเด่น',title:'ผู้สนับสนุนวิดีโอ'}
} satisfies Record<Language,{helpful:string;helpers:string;sort:string;featured:string;title:string}>;
export function activityLabels(lang:Language){return copy[lang];}
