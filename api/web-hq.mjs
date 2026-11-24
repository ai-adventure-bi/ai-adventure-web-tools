import {createHandler} from '../web-hq/api/index.mjs';
export default createHandler({basePath:'/web-hq',environment:()=>({
 DATABASE_URL:process.env.WEB_HQ_DATABASE_URL,
 SUPABASE_URL:process.env.WEB_HQ_SUPABASE_URL,
 SUPABASE_SECRET_KEY:process.env.WEB_HQ_SUPABASE_SECRET_KEY,
 STUDIO_SETUP_TOKEN:process.env.WEB_HQ_SETUP_TOKEN,
 HEYOTTO_MODEL:process.env.WEB_HQ_HEYOTTO_MODEL||'heyotto-code',
 HEYOTTO_APP_ID:process.env.WEB_HQ_HEYOTTO_APP_ID,
 HEYOTTO_TIMEOUT_MS:process.env.WEB_HQ_HEYOTTO_TIMEOUT_MS||'180000'
})});
