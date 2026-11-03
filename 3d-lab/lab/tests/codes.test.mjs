import test from 'node:test';import assert from 'node:assert/strict';
import {normaliseCode,shortCode} from '../codes.mjs';import {dispatch} from '../api.mjs';import {issueSession} from '../../../server/session.mjs';
test('six-character codes are case-insensitive; old full codes remain valid',()=>{assert.equal(normaliseCode(' a1b2c3 '),'A1B2C3');assert.equal(normaliseCode('abcdef'.repeat(4)),'ABCDEF'.repeat(4));assert.equal(shortCode('123456789012345678ABCDEF'),'ABCDEF');for(const value of ['abc','1234567','ABC*12','<html>'])assert.throws(()=>normaliseCode(value));assert.equal(36**6,2176782336);});
test('legacy short-code retrieval resolves the original project and preserves approval gating',async()=>{
 const original=globalThis.fetch;process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';let ambiguous=false,signs=0;
 globalThis.fetch=async(url)=>{const u=new URL(url);let data;
  if(u.pathname.endsWith('/rpc/topbot_rate_limit'))data=true;
  else if(u.pathname.endsWith('/topbot_schools'))data=[{active:true}];
  else if(u.pathname.endsWith('/lab_students')){if(u.searchParams.get('code')==='eq.ABCDEF')data=[];else data=Array.from({length:ambiguous?2:1},()=>({code:'123456789012345678ABCDEF',class_code:'1234',approval:'pending',state:'review'}));}
  else{signs++;throw Error('Unexpected model access');}return new Response(JSON.stringify(data));
 };
 const req={headers:{},socket:{remoteAddress:'test'}};
 try{const status=await dispatch({action:'status',code:'abcdef'},req);assert.equal(status.code,'ABCDEF');await assert.rejects(dispatch({action:'file',code:'abcdef',kind:'model'},req),e=>e.status===403);assert.equal(signs,0);ambiguous=true;await assert.rejects(dispatch({action:'status',code:'abcdef'},req),e=>e.status===409);}finally{globalThis.fetch=original;}
});
test('issuing six-character codes retries both existing suffixes and atomic insert collisions',async()=>{
 const original=globalThis.fetch;process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.TOPBOT_ADMIN_CODE='test';process.env.TOPBOT_SESSION_SECRET='x'.repeat(40);let checks=0,inserts=0;
 globalThis.fetch=async(url,options={})=>{const u=new URL(url);let data;
  if(u.pathname.endsWith('/rpc/topbot_rate_limit'))data=true;else if(u.pathname.endsWith('/topbot_schools'))data=[{active:true}];
  else if(options.method==='POST'){inserts++;const value=JSON.parse(options.body);assert.match(value.code,/^[A-Z0-9]{6}$/);assert.match(options.headers.Prefer,/ignore-duplicates/);data=inserts===1?[]:[value];}
  else{checks++;data=checks===1?[{code:'old-suffix'}]:[];}return new Response(JSON.stringify(data));
 };
 try{const req={headers:{authorization:`Bearer ${issueSession().token}`},socket:{remoteAddress:'test'}};const issued=await dispatch({action:'issue',classCode:'1234'},req);assert.match(issued.code,/^[A-Z0-9]{6}$/);assert.equal(checks,3);assert.equal(inserts,2);}finally{globalThis.fetch=original;}
});
