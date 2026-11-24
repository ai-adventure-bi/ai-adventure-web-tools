import * as Babel from '@babel/standalone';
const supported=new Set(['react','react/jsx-runtime','react/jsx-dev-runtime','react-dom','react-dom/client','lucide-react','three','./styles.css','./style.css','./App.css','./index.css']);
export function compile(source){
  source=source.trim().replace(/^```(?:jsx|tsx|javascript|js|react)?\s*\n/i,'').replace(/\n```\s*$/,'');
  if(!source)throw new Error('Paste your JSX code or choose a starter first.');
  const checked=Babel.transform(source,{
    filename:'App.tsx',ast:true,code:false,parserOpts:{plugins:['jsx','typescript']},
    plugins:[function(){return {visitor:{
      ImportDeclaration(path){const name=path.node.source.value;if(!supported.has(name))throw path.buildCodeFrameError(`“${name}” is not included yet. Available libraries: React, lucide-react and Three.js. Keep the code in one file or ask your teacher about this library.`);},
      CallExpression(path){if(path.node.callee.type==='Import')throw path.buildCodeFrameError('Dynamic imports are not available. Put your components in this file.');if(path.node.callee.name==='require'&&(!path.node.arguments[0]||!supported.has(path.node.arguments[0].value)))throw path.buildCodeFrameError('That package is not included.');},
      ExportNamedDeclaration(path){if(path.node.source)throw path.buildCodeFrameError('Re-exported files are not included. Put the components in App.jsx.');}
    }};}],sourceMaps:false
  });
  const result=Babel.transformFromAst(checked.ast,source,{filename:'App.tsx',presets:[['react',{runtime:'classic'}],['typescript',{isTSX:true,allExtensions:true}]],plugins:['transform-modules-commonjs']});
  return result.code;
}

// HTML exports may contain already-transpiled React modules. Import maps are
// data, not executable JavaScript; imports resolve only to our local runtime.
export function compileHtml(source){
 const scripts=[];
 for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  const attrs=match[1],type=attrs.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase()||'';
  if(/\bsrc\s*=/i.test(attrs))throw new Error('External JavaScript files are not supported. Export a self-contained HTML game or a single JSX file.');
  if(type==='importmap'||type==='application/ld+json'||type==='application/json')continue;
  if(type&& !['module','text/javascript','application/javascript'].includes(type))continue;
  scripts.push({module:type==='module',code:type==='module'?compile(match[2]):match[2]});
 }
 return scripts;
}
