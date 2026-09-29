import assert from 'node:assert/strict';
import {DEFAULT,validateRecipe} from '../js/recipe-validation.js';
import {forms,buildThemeGeometry,themeSolid} from '../js/themes.js';
import * as THREE from '../vendor/three.module.js';
let lowest=Infinity,count=0;
for(const [theme,names] of Object.entries(forms))for(const form of names){
 const p=validateRecipe({...DEFAULT,theme,form,structureWall:2.8}),g=buildThemeGeometry(p),solid=themeSolid(p),mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 const probes=solid.probes.filter((_,i)=>i%Math.max(1,Math.floor(solid.probes.length/16))===0);
 for(const probe of probes)for(const axis of [[1,0,0],[0,1,0],[0,0,1]]){const origin=new THREE.Vector3(...probe.point),d=new THREE.Vector3(...axis);const a=new THREE.Raycaster(origin,d).intersectObject(mesh)[0],b=new THREE.Raycaster(origin,d.clone().negate()).intersectObject(mesh)[0];assert(a&&b,form+' inside strut');const thickness=a.distance+b.distance;lowest=Math.min(lowest,thickness);assert(thickness>=2.4,form+' measured thickness '+thickness);count++;}
 // A horizontal ray through the corrected tip verifies its ACTUAL mesh section.
 for(const y of [-p.tipLength+.7,-p.tipLength/2]){const ray=new THREE.Raycaster(new THREE.Vector3(-20,y,0),new THREE.Vector3(1,0,0)),hits=ray.intersectObject(mesh);const xs=[...new Set(hits.map(h=>h.point.x.toFixed(5)))].map(Number);const diameter=Math.max(...xs)-Math.min(...xs);assert(Math.abs(diameter-solid.tipRadius(y)*2)<.45,form+' tip section '+diameter);}
 g.dispose();mesh.material.dispose();console.log(form+' thickness and tip sections passed');
}
console.log(JSON.stringify({sampledSections:count,minimumMeasuredThickness:lowest,configuredThickness:2.8,meshTolerance:.4}));
