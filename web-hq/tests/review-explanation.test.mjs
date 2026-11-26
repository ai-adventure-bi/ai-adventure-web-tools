import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

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
