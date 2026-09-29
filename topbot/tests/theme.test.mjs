import assert from 'node:assert/strict';
import {DEFAULT,validateRecipe} from '../js/recipe-validation.js';
import {forms,buildThemeGeometry} from '../js/themes.js';
import {massProperties} from '../js/mesh-metrics.js';

for(const [theme,names] of Object.entries(forms))for(const form of names){
 const recipe=validateRecipe({...DEFAULT,theme,form,radialDepth:6,radialCount:8});
 const geometry=buildThemeGeometry(recipe);
 const bounds=geometry.boundingBox, mass=massProperties(geometry);
 assert(bounds.max.x-bounds.min.x>20);
 assert(bounds.max.y-bounds.min.y>30);
 assert(mass.volume>0,`${theme}/${form}: positive enclosed volume`);
 assert(Math.hypot(mass.centre.x,mass.centre.z)<.03,`${theme}/${form}: centred on spin axis`);
 assert([...geometry.attributes.position.array].every(Number.isFinite));
 geometry.dispose();
}
assert.throws(()=>validateRecipe({...DEFAULT,theme:'terra',form:'gyroscope'}),/Form does not belong/);
for(const theme of ['atlantis','galactic','terra']){const form=theme==='terra'?'seed':'gyroscope';const recipe=validateRecipe({...DEFAULT,theme,form,material:'pastelRainbow',rainbowPhase:.37,paint:{strokes:[{p:[3,4,5],size:2,color:'#ff784e'}]}});const reopened=validateRecipe(JSON.parse(JSON.stringify(recipe)));assert.equal(reopened.theme,theme);assert.equal(reopened.material,'pastelRainbow');assert.equal(reopened.rainbowPhase,.37);assert.deepEqual(reopened.paint,recipe.paint);}
console.log('Galactic and Terra forms: valid geometry, centred mass, and painted recipe round trips');

assert.equal(validateRecipe({...DEFAULT,theme:'galactic',form:'gyroscope'}).form,'pulsar');
assert.throws(()=>validateRecipe({...DEFAULT,structureWall:2}),/structureWall/);
assert.throws(()=>validateRecipe({...DEFAULT,structureLayers:2.5}),/whole number/);
