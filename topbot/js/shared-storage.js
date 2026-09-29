const SESSION_KEY = 'topbot.adminSession.v2';
let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch {}
export function hasAdminSession() { return Boolean(session?.token && session.expiresAt > Date.now()); }
export function forgetAdminSession() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
export function rememberAdminSession(data) {
  session = {token:data.token,expiresAt:data.expiresAt};
  try { sessionStorage.setItem(SESSION_KEY,JSON.stringify(session)); } catch {}
}
export async function sharedRequest(action, data = {}, admin = true) {
  const response = await fetch('/api/topbot-data', {
    method:'POST', headers:{'Content-Type':'application/json',...(admin && hasAdminSession()?{Authorization:`Bearer ${session.token}`}:{})},
    body:JSON.stringify({...data,action}), signal:AbortSignal.timeout(20000)
  });
  const body = await response.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if (!response.ok || !body.ok) {
    if (response.status === 401 && admin) {
      forgetAdminSession();
      window.dispatchEvent(new Event('topbot-admin-expired'));
    }
    throw new Error(body.error || 'The request failed. Please try again.');
  }
  return body.result;
}
export async function allRecords(action) {
  const result=[];
  for(let offset=0;;offset+=200) {
    const page=await sharedRequest(action,{offset});
    result.push(...page);
    if(page.length<200) return result;
  }
}
