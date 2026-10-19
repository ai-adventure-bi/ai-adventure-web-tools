import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=readFileSync('app/live-waveform.tsx','utf8');
const code=source.match(/const displayPoints=.*?;\r?\n/)[0];
const display=new Function('EXPLORER_FULL_SCALE_COUNTS',ts.transpile(code)+';return displayPoints;')(100000);
assert.equal(display([-100,100],false)[1],.001);
assert.equal(display([-1000,1000],false)[1],.01);
assert.equal(display([-200000,200000],false)[1],2); // No numerical clipping or compression.
assert.equal(display([-100,100],true)[1],1);
console.log('PASS fixed-count amplitude scale preserves ratios and does not fit or compress explorer traces');
const {default:handler}=await import('../api/quake-quest/[...route].mjs');
process.env.QUAKE_BACKEND_URL='https://backend.example';process.env.QUAKE_PROXY_TOKEN='test-only';
let sent;globalThis.fetch=async(url,options)=>{sent={url:String(url),options};return new Response('{"connected":true}',{headers:{'content-type':'application/json','set-cookie':'qq_otto=test; HttpOnly; Secure; SameSite=Strict; Path=/api/quake-quest/heyotto'}})};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.statusCode=s;return this},json(body){this.body=body},end(body){this.body=body}}}
let res=response();await handler({url:'/api/quake-quest/heyotto/status',method:'GET',headers:{host:'app.example',cookie:'qq_otto=test'}},res);
assert.equal(res.statusCode,200);assert.equal(sent.options.headers['X-Quake-Proxy-Token'],'test-only');assert.equal(sent.options.headers.Cookie,'qq_otto=test');assert.ok(res.headers['Set-Cookie'][0].includes('HttpOnly'));
res=response();await handler({url:'/api/quake-quest/heyotto/connect',method:'POST',headers:{host:'app.example',origin:'https://evil.example'},body:{}},res);assert.equal(res.statusCode,403);
res=response();await handler({url:'/api/quake-quest/not-allowed',method:'GET',headers:{}},res);assert.equal(res.statusCode,404);
console.log('PASS gateway routes, cookie forwarding, shared token and cross-origin rejection');
