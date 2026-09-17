import assert from 'node:assert/strict';
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
