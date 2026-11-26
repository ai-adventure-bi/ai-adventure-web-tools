import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {shortExplanation,teachingSummary,parseTeaching} from '../src/learning.mjs';

test('explanations enforce word limits for new replies and old saved summaries',()=>{
 const long=Array.from({length:180},(_,i)=>'w'+i).join(' ');
 assert.equal(shortExplanation(long).split(/\s+/).length,45);
 assert.equal(shortExplanation(long,25).split(/\s+/).length,25);
 const short='The dog’s legs move while walking. He stays 1.5 metres away.';
 assert.equal(shortExplanation(short),short);
 assert.equal(teachingSummary({summary:long}).split(/\s+/).length,45);
 assert.equal(teachingSummary({changes:[{explanation:long}]}).split(/\s+/).length,45);
 const parsed=parseTeaching(JSON.stringify({summary:long,changes:[{before:'old',after:'new',explanation:long,test:'Walk forwards.',challenge:'Change the distance.'}]}),'old','new');
 assert.equal(parsed.summary.split(/\s+/).length,45);
 assert.equal(parsed.changes[0].explanation.split(/\s+/).length,25);
});

test('custom explanation stays visible even when no teaching snippet matches the displayed hunk',async()=>{
 const result=await build({entryPoints:['src/code-review.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const summary='In Space game, I changed the title from Moon to Mars and kept the launch button as it was.';
 const props={before:'<h1>Moon</h1>',after:'<h1>Mars</h1>',teaching:{summary,changes:[]},readOnly:true};
 let html=renderToStaticMarkup(React.createElement(module.exports.CodeReview,props));
 assert.ok(html.includes(summary));assert.match(html,/class="model-explanation"/);assert.match(html,/<h3>HeyOtto/);
 html=renderToStaticMarkup(React.createElement(module.exports.CodeReview,{...props,teaching:{changes:[{before:'different snippet',after:'not this hunk',explanation:summary}]}}));
 assert.ok(html.includes(summary));
});
