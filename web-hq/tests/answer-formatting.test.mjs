import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

test('answers format Markdown as readable elements without executing HTML or loading images',async()=>{
 const result=await build({entryPoints:['src/answer-text.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const text='## How it works\n\n**Memory:** use `useState` to remember a number.\n\n- Click the button.\n- Watch the score.\n\n```js\nconst score = 2;\n```\n\n<img src="https://example.invalid/x" onerror="alert(1)">\n\n![remote image](https://example.invalid/photo.png)\n\n[bad link](javascript:alert(1))';
 const html=renderToStaticMarkup(React.createElement(module.exports.AnswerText,{text}));
 assert.match(html,/<h4>How it works<\/h4>/);assert.match(html,/<strong>Memory:<\/strong>/);assert.match(html,/<code>useState<\/code>/);assert.match(html,/<ul>/);assert.match(html,/<li>Watch the score\.<\/li>/);assert.match(html,/<pre><code/);
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('<a '));
});
