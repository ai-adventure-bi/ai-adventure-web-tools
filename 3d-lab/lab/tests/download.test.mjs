import test from 'node:test';import assert from 'node:assert/strict';
import {boundedDownload} from '../api.mjs';
test('accepts the additional authenticated-task CDN and rejects lookalikes',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).hostname,'openapi-dl.data.tripo3d.com');assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);return new Response(Buffer.from('glTFfixture'));};
 try{await boundedDownload('https://openapi-dl.data.tripo3d.com/model.glb');for(const url of ['https://openapi-dl.data.tripo3d.com.evil.test/file','https://other.data.tripo3d.com/file','http://openapi-dl.data.tripo3d.com/file'])await assert.rejects(boundedDownload(url),e=>e.status===502);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('downloads from the exact authenticated-task CDN host without forwarding credentials',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).hostname,'tripo-data.rg1.data.tripo3d.com');assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);return new Response(Buffer.from('glTFfixture'));};
 try{const data=await boundedDownload('https://tripo-data.rg1.data.tripo3d.com/model.glb?signature=fixture');assert.equal(data.toString(),'glTFfixture');assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('rejects unrelated hosts, suffix tricks, credentials and insecure URLs before fetching',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected request');};
 try{for(const url of ['http://tripo-data.rg1.data.tripo3d.com/file','https://tripo-data.rg1.data.tripo3d.com.evil.test/file','https://eviltripo3d.ai/file','https://127.0.0.1/file','https://other.tripo3d.com/file','https://user:pass@tripo-data.rg1.data.tripo3d.com/file','https://tripo-data.rg1.data.tripo3d.com:8443/file'])await assert.rejects(boundedDownload(url),e=>e.status===502);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
