// Same-origin Vercel gateway. Secrets and HeyOtto sessions stay on the Python service.
const routes = new Set(['seismic','waveform','station-photo','station-environment','investigation/cases','investigation/manifest','investigation/wave','investigation/hint','investigation/reveal','heyotto/status','heyotto/round','heyotto/connect','heyotto/disconnect','heyotto/start','heyotto/submit','heyotto/reveal']);
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const fail=(status,error)=>res.status(status).json({error});
  const url=new URL(req.url,'https://local.invalid');
  const route=url.pathname.replace(/^\/api\/quake-quest\//,'');
  if(!routes.has(route)||!['GET','POST'].includes(req.method))return fail(404,'Unknown route.');
  const base=process.env.QUAKE_BACKEND_URL,token=process.env.QUAKE_PROXY_TOKEN;
  if(!base||!token)return fail(503,'Quake Quest backend is not configured.');
  try {
    const upstream=new URL(base);
    if(upstream.protocol!=='https:')return fail(503,'Backend must use HTTPS.');
    if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return fail(403,'Cross-origin requests are not allowed.');
    if(req.headers['sec-fetch-site']==='cross-site')return fail(403,'Cross-site requests are not allowed.');
    const body=req.method==='POST'?JSON.stringify(req.body):undefined;
    if(body&&Buffer.byteLength(body)>16384)return fail(413,'Request too large.');
    upstream.pathname='/api/quake-quest/'+route; upstream.search=url.search;
    const headers={'X-Quake-Proxy-Token':token,'Accept-Encoding':'identity','Origin':upstream.origin};
    if(req.headers.cookie)headers.Cookie=req.headers.cookie;
    if(body)headers['Content-Type']='application/json';
    const response=await fetch(upstream,{method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(240000)});
    res.statusCode=response.status;
    res.setHeader('Content-Type',response.headers.get('content-type')||'application/octet-stream');
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {return fail(503,'The earthquake service is temporarily unavailable. Please retry.');}
}
