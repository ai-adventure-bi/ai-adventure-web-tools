export function chooseClass(classes,previous=''){
 return classes.some(c=>c.id===previous)?previous:classes[0]?.id||'';
}
