import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,compileHtml} from '../src/compiler.mjs';

test('Three.js JSX and exported React HTML modules use supported local libraries',()=>{
 assert.match(compile("import * as THREE from 'three'; export default function App(){return <div>{new THREE.Vector3().x}</div>}"),/require\("three"\)/);
 const html='<script type="importmap">{"imports":{"react":"https://example.invalid/react"}}</script><script>window.example=1;</script><script type="module">import React from "react";import DOM from "react-dom/client";import {jsx} from "react/jsx-runtime";import * as THREE from "three";DOM.createRoot(document.getElementById("root")).render(jsx("div",{children:new THREE.Vector3().x}));export default React;</script>';
 const scripts=compileHtml(html);assert.equal(scripts.length,2);assert.equal(scripts[0].module,false);assert.equal(scripts[1].module,true);assert.match(scripts[1].code,/require\("three"\)/);assert.ok(!scripts.some(s=>s.code.includes('example.invalid')));
 assert.throws(()=>compileHtml('<script src="https://example.invalid/library.js"></script>'),/External JavaScript/);
 assert.throws(()=>compileHtml('<script type="module">import x from "https://example.invalid/x.js";</script>'),/not included/);
 assert.throws(()=>compileHtml('<script type="module">import("https://example.invalid/x.js")</script>'),/Dynamic imports/);
 assert.deepEqual(compileHtml('<script type="application/json">{"hello":"world"}</script>'),[]);
});
