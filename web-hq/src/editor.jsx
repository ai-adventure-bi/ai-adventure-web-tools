export const closeCodeSearch=view=>view&&closeSearchPanel(view);
export const locateCode=(view,text)=>{if(!view)return;view.dispatch({effects:setSearchQuery.of(new SearchQuery({search:text,literal:true}))});openSearchPanel(view);findNext(view);};
import {search,searchKeymap,openSearchPanel,SearchQuery,setSearchQuery,findNext,closeSearchPanel} from '@codemirror/search';
export const searchCode=view=>view&&openSearchPanel(view);
import React,{useEffect,useRef} from 'react';
import {EditorView,keymap,highlightActiveLineGutter,lineNumbers} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {syntaxHighlighting,defaultHighlightStyle,bracketMatching,indentOnInput} from '@codemirror/language';

export function CodeEditor({value,onChange,onSelect,editorRef,language='jsx',readOnly=false,active=true}){
 const host=useRef(),view=useRef(),callbacks=useRef({onChange,onSelect});callbacks.current={onChange,onSelect};
 useEffect(()=>{
  const instance=new EditorView({parent:host.current,state:EditorState.create({doc:value,extensions:[search({top:true}),lineNumbers(),highlightActiveLineGutter(),history(),bracketMatching(),indentOnInput(),javascript({jsx:true,typescript:true}),syntaxHighlighting(defaultHighlightStyle),keymap.of([...searchKeymap,indentWithTab,...defaultKeymap,...historyKeymap]),EditorView.lineWrapping,EditorState.readOnly.of(readOnly),EditorView.editable.of(!readOnly),EditorView.updateListener.of(update=>{if(update.docChanged)callbacks.current.onChange?.(update.state.doc.toString());if(update.selectionSet){const s=update.state.selection.main;callbacks.current.onSelect?.(s.empty?null:{from:s.from,to:s.to,text:update.state.sliceDoc(s.from,s.to)});}}),EditorView.theme({'&':{height:'100%',fontSize:'13px',background:'#fffefa'},'.cm-scroller':{overflow:'auto',fontFamily:'ui-monospace, SFMono-Regular, Consolas, monospace',lineHeight:'1.8'},'.cm-content':{padding:'18px 0'},'.cm-gutters':{background:'#f6f5f0',color:'#aaa69b',border:'none',paddingRight:'10px'},'.cm-activeLineGutter':{background:'#ece8fa'},'.cm-focused':{outline:'none'},'.cm-cursor':{borderLeftColor:'#6751c1'},'.cm-selectionBackground':{background:'#ddd4fa !important'}})]})});
  view.current=instance;if(editorRef)editorRef.current=instance;return()=>{instance.destroy();view.current=null;if(editorRef?.current===instance)editorRef.current=null;};
 },[language,readOnly]);
 useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==value)v.dispatch({changes:{from:0,to:v.state.doc.length,insert:value}});},[value]);
 useEffect(()=>{const close=()=>{if(view.current)closeSearchPanel(view.current);};window.addEventListener('studio-dialog-open',close);return()=>window.removeEventListener('studio-dialog-open',close);},[]);
 useEffect(()=>{if(!active&&view.current)closeSearchPanel(view.current);},[active]);
 return <div className="code-host" ref={host}/>;
}
