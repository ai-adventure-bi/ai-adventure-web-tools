import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as recipe from '../js/recipe-validation.js';
import {forms} from '../js/themes.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function mutate(){'),source.indexOf('\nfunction download(){'));
const editor={value:''},enums=['styles','rimPatterns','bodyCrowns','bodyThemes','handles','pommels','hubs','topperStyles'];
let calls=0,seed=12345;const seededMath=Object.create(Math);seededMath.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const mutate=new Function('validate','editor','forms',...enums,'regenerate','Math',code+';return mutate;')(recipe.validateRecipe,editor,forms,...enums.map(k=>recipe[k]),()=>{recipe.validateRecipe(JSON.parse(editor.value));calls++;},seededMath);
for(const theme of ['atlantis','galactic','terra']){const materials=new Set(),colours=new Set(),seen=new Set();editor.value=JSON.stringify({...recipe.DEFAULT,theme,form:theme==='terra'?'seed':'pulsar'});for(let i=0;i<100;i++){mutate();const p=JSON.parse(editor.value);assert.equal(p.theme,theme);if(theme!=='atlantis')assert(forms[theme].includes(p.form));materials.add(p.material);colours.add(p.color);seen.add(p.form);}assert.deepEqual([...materials].sort(),['pastelRainbow','vividRainbow','white']);assert(colours.size>1);if(theme!=='atlantis')assert.equal(seen.size,forms[theme].length);}
console.log(`${calls} mutations: theme retained, all forms reached, all filament choices and multiple colours reached.`);
