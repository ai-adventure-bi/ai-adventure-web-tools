export function normaliseCode(value){
 const result=typeof value==='string'?value.trim().toUpperCase():'';
 if(!/^(?:[A-Z0-9]{6}|[A-F0-9]{24})$/.test(result))throw Error('Enter your six-character project code. Existing full project codes also work.');
 return result;
}
export function shortCode(value){return String(value||'').toUpperCase().slice(-6);}
