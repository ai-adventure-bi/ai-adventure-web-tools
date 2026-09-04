import {chat} from '../topbot/server.mjs';

function requestHost(req){
  const forwarded=String(req.headers['x-forwarded-host']||'').split(',')[0].trim();
  return forwarded||String(req.headers.host||'').trim();
}

export default async function handler(req,res){
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  if(req.method!=='POST'){
    res.setHeader('allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){
    return res.status(415).json({error:'TopBot expects a JSON request.'});
  }
  const origin=req.headers.origin;
  if(origin){
    let originHost='';
    try{originHost=new URL(origin).host;}catch{return res.status(403).json({error:'Request origin is not valid.'});}
    if(originHost!==requestHost(req))return res.status(403).json({error:'Cross-site requests are not allowed.'});
  }
  return chat(req,res);
}
