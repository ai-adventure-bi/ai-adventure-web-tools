import assert from 'node:assert/strict';
import {database} from '../../server/database.mjs';
process.env.SUPABASE_URL='https://example.supabase.co/rest/v1/';
process.env.SUPABASE_SECRET_KEY=' sb_secret_test ';
globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://example.supabase.co/rest/v1/test');
  assert.equal(options.headers.apikey,'sb_secret_test');
  return {ok:true,json:async()=>[]};
};
assert.deepEqual(await database('test'),[]);
for(const [code,expected] of [['ENOTFOUND',/Cannot find/],['EACCES',/blocked/],['CERT_HAS_EXPIRED',/certificate/],['UND_ERR_CONNECT_TIMEOUT',/timed out/],['ECONNRESET',/interrupted/]]) {
  globalThis.fetch=async()=>{throw Object.assign(new Error('secret must not be displayed'),{cause:{code}});};
  await assert.rejects(database('test'),expected);
}
for(const [status,code,expected] of [[401,'',/rejected the API key/],[403,'',/denied/],[404,'PGRST202',/not found in this project/]]) {
  globalThis.fetch=async()=>({ok:false,status,json:async()=>({code})});
  await assert.rejects(database('test'),expected);
}
process.env.SUPABASE_SECRET_KEY='sb_publishable_test';
await assert.rejects(database('test'),/publishable/);
process.env.SUPABASE_SECRET_KEY='secret\u2026';
await assert.rejects(database('test'),/unsupported/);
process.env.SUPABASE_SECRET_KEY='sb_secret_test';
process.env.SUPABASE_URL='https://example.supabase.co/dashboard';
await assert.rejects(database('test'),/URL is invalid/);
console.log('PASS: URL normalization, trimmed keys, safe network/certificate/permission/timeout messages, rejected keys and missing SQL objects.');
