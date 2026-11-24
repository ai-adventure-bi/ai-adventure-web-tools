// SVG is decoded only as an Image, never inserted as executable page markup.
export function rasterThumbnail(svg){return new Promise(resolve=>{
 if(typeof svg!=='string'||!svg||svg.length>2000000){resolve('');return;}
 const image=new Image(),timer=setTimeout(()=>resolve(''),3500);
 image.onerror=()=>{clearTimeout(timer);resolve('');};
 image.onload=()=>{clearTimeout(timer);try{if(image.naturalWidth<1||image.naturalWidth>4096||image.naturalHeight<1||image.naturalHeight>2048)throw new Error('Image bounds');const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.max(1,Math.round(image.naturalHeight*640/image.naturalWidth));const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);let result=canvas.toDataURL('image/jpeg',0.65);if(result.length>160000)result=canvas.toDataURL('image/jpeg',0.3);resolve(result.length<=160000?result:'');}catch{resolve('');}};
 image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
});}
