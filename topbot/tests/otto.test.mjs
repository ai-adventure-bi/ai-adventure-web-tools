import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {chat,containsJsonObject} from '../server.mjs';
import {DEFAULT} from '../js/recipe-validation.js';
const good={...DEFAULT,experimentalEnabled:true,outlineStyle:'butterfly',alienStyle:'orbitalWaves',handleStyle:'castle'};
assert(containsJsonObject(JSON.stringify(good)));assert(!containsJsonObject(JSON.stringify({...good,toyType:'yoyo'})));assert(!containsJsonObject(JSON.stringify({...good,handleStyle:'ghost'})));
let calls=[];globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:JSON.stringify(calls.length===1?{...good,handleStyle:'ghost'}:good)}}]})};};
const req=Readable.from([Buffer.from(JSON.stringify({messages:[{role:'user',content:'Make a butterfly outline with orbital waves and a castle handle'}],current_recipe:DEFAULT}))]);req.headers={'x-heyotto-api-key':'ak_testfixture1234'};
let status,body;await chat(req,{writeHead(s){status=s;},end(b){body=JSON.parse(b);}});assert.equal(status,200);assert.equal(calls.length,2);assert.equal(JSON.parse(body.content).outlineStyle,'butterfly');assert(calls[0].messages[0].content.includes('DESIGN THEMES: Preserve the selected theme'));console.log('Otto shared validation and correction retry passed (simulated replies).');
