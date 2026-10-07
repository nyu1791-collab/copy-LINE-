import assert from 'node:assert/strict';
import test from 'node:test';
import {issuePagesViewer, verifyPagesViewer, preparePagesRequest, pagesCorsResponse} from '../worker/pages-api.mjs';
import {PAGES_ORIGIN} from '../lib/pages-api-policy.mjs';
const secret = 'test-only-signing-secret-with-at-least-32-characters';
const api = 'https://line-rangers-pvp-community-production.n-yu1791.workers.dev';

test('the bridge validates the signature, expiry and future timestamps', async () => {
  const token = await issuePagesViewer(secret);
  assert.equal(await verifyPagesViewer(token, secret), true);
  assert.equal(await verifyPagesViewer(token.replace(/.$/, token.endsWith('A')?'B':'A'), secret), false);
  assert.equal(await verifyPagesViewer(token, 'another-secret-with-at-least-32-characters'), false);
  assert.equal(await verifyPagesViewer(await issuePagesViewer(secret, Date.now()-367*86400000), secret), false);
  assert.equal(await verifyPagesViewer(await issuePagesViewer(secret, Date.now()+120000), secret), false);
});

test('only a verified Pages guest can write; cookies and identity headers cannot elevate it', async () => {
  const token = await issuePagesViewer(secret);
  const request = new Request(api+'/api/board', {method:'POST', headers:{Origin:PAGES_ORIGIN, 'X-LR-Viewer':token,
    Cookie:'__Host-lr_owner=forged', 'oai-authenticated-user-id':'owner', 'Sec-Fetch-Site':'cross-site'}, body:'{}'});
  const prepared = await preparePagesRequest(request, secret);
  assert.equal(prepared.cors, true);
  assert.equal(prepared.request.headers.get('Cookie'), '__Host-lr_guest='+token);
  assert.equal(prepared.request.headers.get('oai-authenticated-user-id'), null);
  assert.equal(prepared.request.headers.get('Origin'), api);
  assert.equal(await prepared.request.text(), '{}');
  assert.equal((await preparePagesRequest(new Request(api+'/api/board', {method:'POST', headers:{Origin:PAGES_ORIGIN}, body:'{}'}),secret)).response.status,401);
});

test('preflight is restricted to public board endpoints, methods and headers', async () => {
  for (const [path,method,headers,status] of [
    ['/api/board','POST','content-type,x-lr-viewer',204],
    ['/api/upload/part','PUT','content-type,x-lr-viewer',204],
    ['/api/owner','POST','content-type',403],
    ['/api/board','DELETE','x-lr-viewer',403],
    ['/api/board','POST','oai-authenticated-user-id',403],
  ]) {
    const result = await preparePagesRequest(new Request(api+path,{method:'OPTIONS',headers:{Origin:PAGES_ORIGIN,
      'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}}), secret);
    assert.equal(result.response.status,status);
    assert.equal(result.response.headers.get('Access-Control-Allow-Origin'),PAGES_ORIGIN);
    assert.equal(result.response.headers.has('Access-Control-Allow-Credentials'),false);
  }
});

test('other origins cannot get the Pages authorization bridge', async () => {
  const request = new Request(api+'/api/board',{method:'POST',headers:{Origin:'https://attacker.example'},body:'{}'});
  const result = await preparePagesRequest(request,secret);
  assert.equal(result.request,request);
  assert.equal(result.cors,false);
});

test('public metadata and visible media remain readable without third-party cookies', async () => {
  for(const path of ['/api/activity?public=1','/api/media?id=example','/api/ranger-info?unit=example']) {
    const result=await preparePagesRequest(new Request(api+path,{headers:{Origin:PAGES_ORIGIN,Cookie:'__Host-lr_owner=forged'}}),secret);
    assert.equal(result.cors,true);
    assert.equal(result.request.headers.get('Cookie'),null);
  }
  const response=pagesCorsResponse(new Response('body',{headers:{'Set-Cookie':'private', 'Content-Range':'bytes 0-5/6'}}));
  assert.equal(response.headers.has('Set-Cookie'),false);
  assert.equal(response.headers.get('Content-Range'),'bytes 0-5/6');
});
