import {readFile,writeFile} from 'node:fs/promises';

async function patch(path,transform){
 const before=await readFile(path,'utf8');
 const after=transform(before);
 if(after===before)throw new Error(`No changes applied to ${path}`);
 await writeFile(path,after,'utf8');
}
function once(source,needle,replacement,label){
 const first=source.indexOf(needle);if(first<0)throw new Error(`Missing patch anchor: ${label}`);
 if(source.indexOf(needle,first+needle.length)>=0)throw new Error(`Ambiguous patch anchor: ${label}`);
 return source.slice(0,first)+replacement+source.slice(first+needle.length);
}

await patch('app/community.tsx',source=>{
 source=once(source,
  "import {contributionBadges,languages,legacyMultipartMediaBytes,maxMediaBytes,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
  "import {contributionBadges,languages,legacyMultipartMediaBytes,maxImagesPerPost,maxMediaBytes,maxVideosPerPost,mediaPartAttempts,monthJST,requestUUID,type Language,type Role,type ContributionBadge} from '@/lib/rules';",
  'media limit imports');
 source=once(source,
  '}else if(index===0)void uploadImage(fileToSend,description,request,uploadBoard,group);});}',
  '}else void uploadImage(fileToSend,description,request,uploadBoard,group);});}',
  'upload every selected image');
 source=once(source,
  '<span className="media-picker-hint">ここをタップ（動画は最大5本）</span>',
  '<span className="media-picker-hint">ここをタップ（1回の投稿につき動画は最大5本・画像は最大10枚）</span>',
  'media picker hint');
 source=once(source,
  "const selected=Array.from(e.currentTarget.files||[]);if(selected.length>5||selected.some(file=>!file.type.startsWith('video/')&&selected.length>1)){setFiles([]);e.currentTarget.value='';setNotice('動画は最大5本まで。画像を添付する場合は1枚までです。');return;}",
  "const selected=Array.from(e.currentTarget.files||[]);const imageCount=selected.filter(file=>file.type.startsWith('image/')).length;const videoCount=selected.filter(file=>file.type.startsWith('video/')).length;const unsupported=selected.some(file=>!file.type.startsWith('image/')&&!file.type.startsWith('video/'));if(unsupported||imageCount>maxImagesPerPost||videoCount>maxVideosPerPost){setFiles([]);e.currentTarget.value='';setNotice('1回の投稿につき動画は最大5本・画像は最大10枚です。');return;}",
  'media picker limits');
 source=once(source,
  "{new Date(p.created).toLocaleString(lang==='zh'?'zh-TW':lang,{timeZone:'Asia/Tokyo',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} JST</time>",
  "{new Date(p.created).toLocaleString(lang==='zh'?'zh-TW':lang,{timeZone:'Asia/Tokyo',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>",
  'remove visible JST suffix');
 source=once(source,
  '{boardPage&&<button className="owner-access-link" type="button" onClick={()=>setOwnerAccess(true)}>運営アクセス</button>}',
  '{boardPage&&(data?.me?.role===\'owner\'?<span className="owner-mode-indicator" role="status"><ShieldCheck size={15}/>運営モード</span>:<button className="owner-access-link" type="button" onClick={()=>setOwnerAccess(true)}>運営アクセス</button>)}',
  'owner mode indicator');
 return source;
});

await patch('app/api/board/route.ts',source=>{
 const oldBlock=`let boards=(await db.prepare('SELECT * FROM boards WHERE month=? ORDER BY character DESC').bind(requested).all()).results;\n const confirmedTopics=confirmedCharactersForMonth(requested);\n if(requested===current&&!boards.length&&confirmedTopics.length){\n  await db.batch(confirmedTopics.map(c=>db.prepare('INSERT OR IGNORE INTO boards(id,month,character,name,image) VALUES(?,?,?,?,?)').bind(\`${'${requested}:${c.id}'}\`,requested,c.id,c.name,c.image)));\n  boards=(await db.prepare('SELECT * FROM boards WHERE month=? ORDER BY character DESC').bind(requested).all()).results;\n }\n // The current evaluation exposes only explicitly confirmed topics. Archived\n // months remain read-only records and must never disappear merely because\n // their character is not in this month's current catalog.\n if(requested===current)boards=boards.filter(b=>confirmedTopics.some(c=>c.id===b.character)).map(b=>{const c=confirmedTopics.find(c=>c.id===b.character)!;return {...b,name:c.name,image:c.image};});`;
 const newBlock=`let boards=(await db.prepare('SELECT * FROM boards WHERE month=? ORDER BY character DESC').bind(requested).all()).results;\n const confirmedTopics=confirmedCharactersForMonth(requested);\n if(requested===current&&confirmedTopics.length){\n  // A second or third confirmed character may arrive later in the same month.\n  // Add only missing boards; never recreate or overwrite existing discussion data.\n  const existingCharacters=new Set(boards.map(b=>String(b.character)));\n  const missingTopics=confirmedTopics.filter(c=>!existingCharacters.has(c.id));\n  if(missingTopics.length){\n   await db.batch(missingTopics.map(c=>db.prepare('INSERT OR IGNORE INTO boards(id,month,character,name,image) VALUES(?,?,?,?,?)').bind(\`${'${requested}:${c.id}'}\`,requested,c.id,c.name,c.image)));\n   boards=(await db.prepare('SELECT * FROM boards WHERE month=? ORDER BY character DESC').bind(requested).all()).results;\n  }\n  // Current-month order follows the validated PvP ordering from the registry;\n  // confirmed characters without PvP data naturally remain behind those with data.\n  const topicOrder=new Map(confirmedTopics.map((c,index)=>[c.id,index]));\n  boards=boards.filter(b=>topicOrder.has(String(b.character))).map(b=>{const c=confirmedTopics.find(c=>c.id===String(b.character))!;return {...b,name:c.name,image:c.image};}).sort((a,b)=>(topicOrder.get(String(a.character))??Number.MAX_SAFE_INTEGER)-(topicOrder.get(String(b.character))??Number.MAX_SAFE_INTEGER)||String(a.character).localeCompare(String(b.character)));\n }`;
 return once(source,oldBlock,newBlock,'incremental monthly board seeding');
});

await patch('app/community.css',source=>{
 if(source.includes('.owner-mode-indicator{'))throw new Error('Owner indicator CSS already exists unexpectedly');
 return source+`\n.owner-mode-indicator{display:inline-flex;align-items:center;justify-content:center;gap:7px;margin:16px 0 0;padding:8px 12px;border:1px solid #3f9e7c;border-radius:999px;background:#12392f;color:#8de6c3;font-size:13px;font-weight:800}\n`;
});

console.log('Community hardening patch applied.');
