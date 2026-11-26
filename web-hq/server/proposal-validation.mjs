import * as Babel from '@babel/standalone';
import {compile,compileHtml} from '../src/compiler.mjs';

// Parse/transform only. Student JavaScript is never executed on the server.
export function validateProposal(source,kind){
 if(kind==='jsx'){
  const parsed=Babel.transform(source,{filename:'App.tsx',ast:true,code:false,parserOpts:{plugins:['jsx','typescript']}});
  if(!parsed.ast.program.body.some(node=>node.type==='ExportDefaultDeclaration'))throw new Error('A default export is required for App.jsx.');
  compile(source);
 }else{
  if((source.match(/<script\b/gi)||[]).length!==(source.match(/<\/script\s*>/gi)||[]).length)throw new Error('An HTML script is unfinished.');
  if((source.match(/<style\b/gi)||[]).length!==(source.match(/<\/style\s*>/gi)||[]).length)throw new Error('An HTML style section is unfinished.');
  for(const script of compileHtml(source))if(!script.module)Babel.transform(script.code,{filename:'inline.js',sourceType:'script',ast:false,code:false});
 }
}
