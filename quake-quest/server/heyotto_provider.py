"""HeyOtto Passport v0.1: documented consumer Bearer authentication.
The provider rejects system messages and response_format. Keep the successful
instructions intact in a user message and strictly validate output ourselves.
"""
import json,os,time
import requests
BASE='https://api.chat.heyotto.app/v1'
class ProviderError(Exception):pass
class HeyOttoProvider:
    def request(self,method,path,key,payload=None):
        try:
            with requests.request(method,BASE+path,headers={'Authorization':'Bearer '+key,'Accept':'application/json'},json=payload,timeout=(8,75 if method=='POST' else 20),allow_redirects=False,stream=True) as r:
                if r.status_code in (401,403):raise ProviderError('HeyOtto rejected this API key or its permissions. Reconnect or continue solo.')
                if r.status_code==429:raise ProviderError('HeyOtto rate limit reached. Continue solo or try a later round.')
                if r.status_code!=200:raise ProviderError('HeyOtto is unavailable or could not accept this request. Continue solo.')
                raw=bytearray();deadline=time.monotonic()+80
                for part in r.iter_content(8192):
                    raw.extend(part)
                    if len(raw)>256000 or time.monotonic()>deadline:raise ProviderError('HeyOtto response exceeded the size or time limit.')
                return json.loads(raw)
        except requests.RequestException:raise ProviderError('HeyOtto connection timed out or is unavailable. Continue solo.') from None
        except (ValueError,TypeError):raise ProviderError('HeyOtto returned an unreadable response.') from None
    def authenticate(self,key):
        result=self.request('GET','/models',key)
        model=os.getenv('HEYOTTO_MODEL','heyotto')
        if not isinstance(result,dict) or not isinstance(result.get('data'),list) or not any(m.get('id')==model for m in result['data'] if isinstance(m,dict)):raise ProviderError('The configured HeyOtto model is not available to this key.')
    def analyse(self,key,system,data,correction=None):
        content=system+'\n\n'+(correction+'\n\n' if correction else '')+'DATA:\n'+json.dumps(data,separators=(',',':'),allow_nan=False)
        payload={'model':os.getenv('HEYOTTO_MODEL','heyotto'),'messages':[{'role':'user','content':content}],'stream':False}
        app=os.getenv('HEYOTTO_APP_ID')
        if app:payload['app_id']=app
        # No conversation_id: separate rounds cannot inherit earlier case answers.
        result=self.request('POST','/chat/completions',key,payload)
        try:
            choice=result['choices'][0]
            if choice['finish_reason']!='stop' or choice['message']['role']!='assistant':raise KeyError()
            content=choice['message']['content']
            if not isinstance(content,str):raise KeyError()
            return content
        except (KeyError,IndexError,TypeError):raise ProviderError('HeyOtto did not return a complete text response.') from None
