import test from 'node:test';
import assert from 'node:assert/strict';
import {tripoFailure} from '../api.mjs';
test('Tripo failure exposes diagnostic status/code without echoing secrets or URLs',()=>{
 const message=tripoFailure(400,{code:1004,message:'secret-key https://private.test/model'});
 assert.match(message,/HTTP 400; provider code 1004/);assert.match(message,/parameters/);assert.doesNotMatch(message,/secret-key|private.test/);
});
test('unreadable Tripo errors still give safe HTTP diagnostics',()=>{assert.match(tripoFailure(401,null),/API key/);assert.match(tripoFailure(502,null),/HTTP 502/);});
test('provider code 2010 explains insufficient API credits instead of generic access denial',()=>{const message=tripoFailure(403,{code:2010});assert.match(message,/not enough Tripo API credits/);assert.doesNotMatch(message,/denied access/);});
