export const MAX_IMAGE_BYTES=2*1024*1024,MAX_VIDEO_BYTES=3*1024*1024;
export function validateThumbnail(value){
 if(value===undefined||value==='')return '';
 if(typeof value!=='string'||value.length>160000||!value.startsWith('data:image/jpeg;base64,'))throw new Error('The thumbnail must be a small JPEG image.');
 validateMedia('thumbnail.jpg',value);return value;
}
export function validateMedia(name,dataUrl){
 if(typeof name!=='string'||!name.trim()||name.length>160)throw new Error('Use a filename below 160 characters.');
 const match=typeof dataUrl==='string'&&dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/]*={0,2})$/);
 if(!match||match[2].length%4!==0)throw new Error('Upload a PNG, JPG, GIF, WebP image or MP4/WebM video. SVG files are not supported.');
 const mime=match[1],bytes=Buffer.from(match[2],'base64'),limit=mime.startsWith('image/')?MAX_IMAGE_BYTES:MAX_VIDEO_BYTES;
 if(!bytes.length||bytes.length>limit)throw new Error(mime.startsWith('image/')?'Images must be below 2 MB.':'Video files must be below 3 MB. Use a direct HTTPS video URL for larger clips.');
 const ascii=(start,end)=>bytes.subarray(start,end).toString('ascii');
 const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/gif'?['GIF87a','GIF89a'].includes(ascii(0,6)):mime==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':mime==='video/mp4'?ascii(4,8)==='ftyp':bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]));
 if(!valid)throw new Error('The file contents do not match its image or video type.');
 return {name:name.trim(),mime,bytes:bytes.length,dataUrl};
}
