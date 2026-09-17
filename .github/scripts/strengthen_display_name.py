from pathlib import Path

session_path = Path('lib/anonymous-session.ts')
session = session_path.read_text(encoding='utf-8')
old_type = "export type AnonymousSession={sub:string;anonymous:boolean;owner?:boolean;displayName?:string;setCookie?:string;setCookies?:string[]};"
new_type = "export type AnonymousSession={sub:string;anonymous:boolean;owner?:boolean;displayName?:string;setCookie?:string;setCookies?:string[];newGuest?:boolean};"
if old_type not in session:
    raise SystemExit('anonymous-session type contract changed; refusing blind patch')
session = session.replace(old_type, new_type, 1)
old_existing = "if(existing){const sub=await verify(existing);if(sub)return {sub,anonymous:true,displayName:savedDisplayName};}"
new_existing = "if(existing){const sub=await verify(existing);if(sub)return {sub,anonymous:true,displayName:savedDisplayName,setCookie:await guestCookie(sub),setCookies:savedDisplayName?[displayNameCookie(savedDisplayName)]:[],newGuest:false};}"
if old_existing not in session:
    raise SystemExit('anonymous-session guest restore contract changed; refusing blind patch')
session = session.replace(old_existing, new_existing, 1)
old_new = "return {sub,anonymous:true,displayName:savedDisplayName,setCookie:await guestCookie(sub)};"
new_new = "return {sub,anonymous:true,displayName:savedDisplayName,setCookie:await guestCookie(sub),newGuest:true};"
if old_new not in session:
    raise SystemExit('anonymous-session new guest contract changed; refusing blind patch')
session = session.replace(old_new, new_new, 1)
session_path.write_text(session, encoding='utf-8')

board_path = Path('app/api/board/route.ts')
board = board_path.read_text(encoding='utf-8')
old_board = "const freshAnonymous=session.anonymous===true&&!!session.setCookie;"
new_board = "const freshAnonymous=session.anonymous===true&&session.newGuest===true;"
if old_board not in board:
    raise SystemExit('board fresh-anonymous contract changed; refusing blind patch')
board_path.write_text(board.replace(old_board, new_board, 1), encoding='utf-8')

upload_path = Path('lib/upload-session.ts')
upload = upload_path.read_text(encoding='utf-8')
old_upload = "const session=await sessionFromHeaders(h);const {sub}=session;const freshAnonymous=session.anonymous===true&&!!session.setCookie;"
new_upload = "const session=await sessionFromHeaders(h);const {sub}=session;const freshAnonymous=session.anonymous===true&&session.newGuest===true;"
if old_upload not in upload:
    raise SystemExit('upload fresh-anonymous contract changed; refusing blind patch')
upload_path.write_text(upload.replace(old_upload, new_upload, 1), encoding='utf-8')

community_path = Path('app/community.tsx')
community = community_path.read_text(encoding='utf-8')
anchor = " useEffect(()=>{if(!boardPage)return;const controller=new AbortController();const timer=window.setTimeout(()=>void reload(controller.signal),0);return()=>{clearTimeout(timer);controller.abort();};},[reload,boardPage]);\n"
if anchor not in community:
    raise SystemExit('community reload effect changed; refusing blind patch')
restore_effect = """ // If Safari/user cleanup removes the signed guest/display cookies but localStorage
 // survives, re-bind the saved display name to the newly minted anonymous
 // subject. A display name is never an authorization credential; the server
 // still owns identity, roles, validation, and the HttpOnly cookies.
 useEffect(()=>{
  if(!boardPage||!data||data.me||!data.anonymous||profileRestoreInFlight.current)return;
  let savedDisplay='';try{savedDisplay=localStorage.getItem(displayNameStorageKey)||'';}catch{}
  savedDisplay=savedDisplay.trim();if(!savedDisplay)return;
  const restoreKey='local-storage-bootstrap';if(profileRestoreSubject.current===restoreKey)return;
  profileRestoreInFlight.current=restoreKey;
  void rawBoardRequest<{error?:string;me?:Data['me']}>({action:'profile',name:savedDisplay}).then(result=>{
   if(!result.me)return;profileRestoreSubject.current=restoreKey;persistDisplayName(result.me.name);setName(result.me.name);setData(current=>current?{...current,me:result.me!}:current);
  }).catch(()=>{}).finally(()=>{if(profileRestoreInFlight.current===restoreKey)profileRestoreInFlight.current='';});
 },[boardPage,data]);
"""
community_path.write_text(community.replace(anchor, anchor + restore_effect, 1), encoding='utf-8')

test_path = Path('tests/display-name-persistence.test.mjs')
test_path.write_text(r'''import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
const communitySource=readFileSync(new URL('app/community.tsx',root),'utf8');
const sessionSource=readFileSync(new URL('lib/anonymous-session.ts',root),'utf8');
const boardSource=readFileSync(new URL('app/api/board/route.ts',root),'utf8');
const uploadSource=readFileSync(new URL('lib/upload-session.ts',root),'utf8');
function compile(path,require){const source=readFileSync(new URL(path,root),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('exports','require',code)(exports,require);return exports;}
const anonymous=compile('lib/anonymous-session.ts',id=>{if(id==='cloudflare:workers')return {env:{BOARD_ANON_COOKIE_SECRET:'test-anon-cookie-secret-0123456789012345',BOARD_OWNER_SUBJECT:'owner-subject',BOARD_OWNER_ACCESS_TOKEN:'owner-access'}};if(id==='@/lib/rules')return {ownerDisplayName:'LINEレンジャーは神ゲー'};throw new Error('Unexpected import '+id);});
function cookiePair(setCookie){return String(setCookie||'').split(';',1)[0];}

test('returning anonymous sessions renew cookies without becoming fresh identities',async()=>{const first=await anonymous.sessionFromHeaders(new Headers());assert.equal(first.anonymous,true);assert.equal(first.newGuest,true);assert.match(first.setCookie||'',/^__Host-lr_guest=v1\./);assert.match(first.setCookie||'',/Max-Age=31536000/);const returning=await anonymous.sessionFromHeaders(new Headers({cookie:cookiePair(first.setCookie)}));assert.equal(returning.sub,first.sub);assert.equal(returning.anonymous,true);assert.equal(returning.newGuest,false);assert.match(returning.setCookie||'',/^__Host-lr_guest=v1\./);assert.match(returning.setCookie||'',/Max-Age=31536000/);});

test('returning display name refreshes its server-only fallback cookie',async()=>{const first=await anonymous.sessionFromHeaders(new Headers());const guest=cookiePair(first.setCookie);const display=cookiePair(anonymous.displayNameCookie('保存ユーザー'));const returning=await anonymous.sessionFromHeaders(new Headers({cookie:`${guest}; ${display}`}));assert.equal(returning.displayName,'保存ユーザー');assert.ok(returning.setCookies?.some(value=>value.includes('__Host-lr_display_name=')));assert.ok(returning.setCookies?.every(value=>value.includes('HttpOnly')));});

test('cookie renewal is separate from new-session abuse limits',()=>{assert.match(boardSource,/session\.newGuest===true/);assert.match(uploadSource,/session\.newGuest===true/);assert.doesNotMatch(boardSource,/freshAnonymous=session\.anonymous===true&&!!session\.setCookie/);assert.doesNotMatch(uploadSource,/freshAnonymous=session\.anonymous===true&&!!session\.setCookie/);});

test('client can rebind a saved local display name after only cookies are cleared',()=>{assert.match(communitySource,/local-storage-bootstrap/);assert.match(communitySource,/!boardPage\|\|!data\|\|data\.me\|\|!data\.anonymous/);assert.match(communitySource,/localStorage\.getItem\(displayNameStorageKey\)/);assert.match(communitySource,/rawBoardRequest<\{error\?:string;me\?:Data\['me'\]\}>\(\{action:'profile',name:savedDisplay\}\)/);assert.match(communitySource,/persistDisplayName\(result\.me\.name\)/);});

test('display names remain non-authoritative and server cookies stay protected',()=>{assert.match(sessionSource,/Display names are not credentials/);assert.match(sessionSource,/__Host-lr_display_name/);assert.match(sessionSource,/SameSite=Lax; Secure; HttpOnly/);assert.doesNotMatch(sessionSource,/displayName.*role.*owner/i);});
''',encoding='utf-8')
