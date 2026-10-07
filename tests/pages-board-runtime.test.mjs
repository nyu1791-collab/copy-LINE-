import assert from 'node:assert/strict';
import test from 'node:test';
import {Miniflare} from 'miniflare';
import {fileURLToPath} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {PAGES_ORIGIN} from '../lib/pages-api-policy.mjs';

test('Pages guests can browse, set a name, post and vote with third-party cookies disabled',async()=>{
 const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('../dist/server/index.js',import.meta.url)),
  modulesRules:[{type:'ESModule',include:['**/*.js']}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
  bindings:{BOARD_ANON_COOKIE_SECRET:'test-only-signing-secret-with-at-least-32-characters'},d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{
  const db=await mf.getD1Database('DB');
  const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort();
  for(const name of migrations){
   const sql=readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8');
   await db.batch(sql.split(';').map(value=>value.replaceAll('--> statement-breakpoint','').trim()).filter(Boolean).map(value=>db.prepare(value)));
  }
  const session=await mf.dispatchFetch('https://review.example/api/session',{headers:{Origin:PAGES_ORIGIN}});
  assert.equal(session.status,200);
  const {viewerToken}=await session.json();
  const headers={Origin:PAGES_ORIGIN,'X-LR-Viewer':viewerToken,'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'};
  const call=async body=>{
   const response=await mf.dispatchFetch('https://review.example/api/board',{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json();
   assert.equal(response.status,200,JSON.stringify(data));
   assert.equal(response.headers.get('Access-Control-Allow-Origin'),PAGES_ORIGIN);
   assert.equal(response.headers.has('Set-Cookie'),false);
   return data;
  };
  const before=await call();
  assert.equal(before.me,null);
  await call({action:'profile',name:'Pages test'});
  const post=await call({action:'post',board:before.board,body:'Pages signed guest post',request:crypto.randomUUID()});
  await call({action:'vote',board:before.board,poll:'strength',choice:0});
  const after=await call();
  assert.equal(after.me.name,'Pages test');
  assert.ok(after.posts.some(row=>row.id===post.id));
  assert.equal(after.mine.find(row=>row.poll==='strength').choice,0);
  const forged=await mf.dispatchFetch('https://review.example/api/board',{method:'POST',headers:{...headers,'X-LR-Viewer':viewerToken.replace(/.$/,'!')},body:JSON.stringify({action:'profile',name:'forged'})});
  assert.equal(forged.status,401);
 }finally{await mf.dispose();}
});
