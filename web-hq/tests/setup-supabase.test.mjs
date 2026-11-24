import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionSettings,updateEnvironment} from '../scripts/setup-supabase.mjs';
test('local setup accepts server keys and rejects public keys and invalid URLs',()=>{
 const key='sb_secret_test-server-key-123456';
 assert.equal(connectionSettings('https://example.supabase.co/',key).SUPABASE_URL,'https://example.supabase.co');
 assert.throws(()=>connectionSettings('http://example.supabase.co',key),/HTTPS/);
 assert.throws(()=>connectionSettings('https://example.supabase.co/rest/v1',key),/HTTPS/);
 assert.throws(()=>connectionSettings('https://example.supabase.co','sb_publishable_public-key-123456'),/secret key/);
 const legacy='header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
 assert.equal(connectionSettings('https://example.supabase.co',legacy).SUPABASE_SECRET_KEY,legacy);
});
test('local setup preserves unrelated environment settings and replaces duplicate connection entries',()=>{
 const result=updateEnvironment('PORT=4185\nSTUDIO_SETUP_TOKEN=keep-private\nSUPABASE_URL=old\nSUPABASE_URL=duplicate\n',{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'local-test-key'});
 assert.ok(result.includes('STUDIO_SETUP_TOKEN=keep-private'));assert.ok(result.includes('PORT=4185'));assert.equal(result.match(/SUPABASE_URL=/g).length,1);assert.ok(result.includes('SUPABASE_SECRET_KEY=local-test-key'));
});
