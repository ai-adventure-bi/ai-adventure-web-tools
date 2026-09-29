// Rearrange existing controls without replacing their values or input handlers.
export function installControlLayout(panel,api){
 const $=id=>panel.querySelector('#'+id),control=panel.parentElement;
 const choice=document.createElement('label');choice.className='toy-choice';choice.textContent='Toy type';
 const select=document.createElement('select');select.id='allToyTypes';
 for(const [value,text] of [['legacy','Original spinning top'],['silhouette','Figurative spinning top'],['hybrid','Low-body alien spinning top'],['yoyo','Yo-yo']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}choice.append(select);panel.querySelector('h2').after(choice);
 const designBox=document.createElement('details');designBox.id='designSection';designBox.className='studio-section';designBox.setAttribute('name','settings-box');const designTitle=document.createElement('summary');designTitle.textContent='Design';designBox.append(designTitle);choice.after(designBox);const legacy=document.querySelector('#controlsEditor');designBox.append(legacy);
 const groups=[];
 const section=(title,category,nodes)=>{const box=document.createElement('details');box.className='studio-section';const summary=document.createElement('summary');summary.textContent=title;box.append(summary);for(const n of nodes.filter(Boolean))box.append(n);if(category==='all'){box.setAttribute('name','settings-box');panel.insertBefore(box,$('colourSection'));}else{box.setAttribute('name','design-submenu');designBox.append(box);}groups.push([box,category]);return box;};
 const label=id=>$(id)?.closest('label');
 section('Body','silhouette',[label('shapeSearch'),label('bodyShape'),label('bodyWidth'),label('bodyStretch')]);
 section('Handle','silhouette',[label('handleShape'),label('handleHeight')]);
 section('Rim','silhouette',[label('edgeStyle'),label('edgeAmount')]);
 section('Surface & small shapes','silhouette',[label('surfaceTexture'),label('reliefType'),$('attachmentList').closest('details')]);
 section('Body & alien features','hybrid',[label('hybridBody'),label('hybridStyle'),label('hybridWidth'),label('hybridAmount'),label('hybridRepeat'),label('hybridTwist')]);
 section('Handle','hybrid',[label('hybridGrip')]);
 section('Balance & printing','design',[label('balanceV2'),$('balanceReport'),$('printMethodHelp')]);
 const advanced=section('JSON','all',[$('recipeSlot')]);
 // The original parameter list now lives directly in the settings panel.
 const json=document.querySelector('#json');advanced.append(json);json.classList.remove('hidden');
 document.querySelector('.editor-tabs').hidden=true;
 const quick=document.querySelector('.quick-controls');control.insertBefore(quick,document.querySelector('.message'));
 document.querySelector('#topperQuickField').hidden=true;
 const regenerate=document.querySelector('#regenerate');advanced.append(regenerate);regenerate.hidden=false;
 $('colourSection').setAttribute('name','settings-box');
 // Native named details plus a fallback for browsers without exclusive accordions.
 panel.addEventListener('toggle',e=>{const opened=e.target;if(!opened.open||!opened.getAttribute('name'))return;for(const other of panel.querySelectorAll('details[name]'))if(other!==opened&&other.getAttribute('name')===opened.getAttribute('name'))other.open=false;},true);
 const saveRow=$('saveDesign').parentElement;$('colourSection').append(saveRow);
 const stash=document.createElement('div');stash.hidden=true;panel.append(stash);stash.append($('constructionSection'),$('slidersSection'));
 // Keep the shared complexity control visible, including when all details are folded.
 const cache={};const kind=p=>p.toyType==='yoyo'?'yoyo':!p.design?'legacy':p.design.hybrid?'hybrid':'silhouette';
 select.onchange=()=>{const current=api.get(),from=kind(current),to=select.value;cache[from]=structuredClone(current);let p=cache[to];if(!p){p=api.baseFamily(to==='yoyo'?'yoyo':'top');if(to==='silhouette'||to==='hybrid'){
   // Use the existing category handler to create its validated default design.
   api.set(p);$('construction').value=to;$('construction').onchange({target:{value:to}});p=api.get();
  }}api.set(p);};
 let previous;
 return {sync(p){const cat=kind(p);select.value=cat;legacy.hidden=!!p.design;legacy.classList.remove('hidden');for(const [box,wanted] of groups){box.hidden=!(wanted==='all'||wanted===cat||wanted==='design'&&!!p.design);if(cat!==previous)box.open=false;}
  label('balanceV2').hidden=cat!=='silhouette';$('printMethodHelp').hidden=cat!=='hybrid';quick.hidden=false;document.querySelector('#topperQuickField').hidden=true;previous=cat;
 }};
}
