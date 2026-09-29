// Test double for the Supabase REST contract. Does not execute the SQL migration.
import http from 'node:http';
export function createMockDatabase() {
  const schools=[], tops=[]; let limited=false;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('content-type','application/json');
    const url=new URL(req.url,'http://localhost');
    let raw=''; for await(const chunk of req) raw+=chunk;
    const body=raw?JSON.parse(raw):{};
    const reply=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
    if(req.headers.apikey !== 'test-database-key') return reply({},401);
    if(url.pathname.endsWith('/rpc/topbot_rate_limit')) return reply(!limited);
    if(url.pathname.endsWith('/rpc/topbot_create_school')) {
      const school={classCode:String(1000+schools.length),schoolName:body.school_name,expectedStudents:body.expected_students,active:true,createdAt:new Date().toISOString(),archivedAt:null};
      schools.push(school);return reply(school);
    }
    if(url.pathname.endsWith('/rpc/topbot_submit')) {
      const existing=tops.find(t=>t.submissionId===body.submission_id);
      if(existing)return reply({topCode:existing.topCode});
      if(!schools.some(s=>s.classCode===body.school_code&&s.active))return reply({message:'School not found or archived'},400);
      const top={topCode:'AAAA'+String(tops.length+2),classCode:body.school_code,studentName:body.student_name,filament:body.chosen_filament,recipe:body.design_recipe,submissionId:body.submission_id,printStatus:'waiting',trashed:false,submittedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      tops.push(top);return reply({topCode:top.topCode});
    }
    const source=url.pathname.endsWith('/topbot_schools')?schools:tops;
    let result=source.filter(row=>[...url.searchParams].every(([key,value])=> !value.startsWith('eq.') || String(row[key])===value.slice(3)));
    if(req.method==='PATCH') result.forEach(row=>Object.assign(row,body));
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||result.length);
    result=result.slice(offset,offset+limit);
    const fields=url.searchParams.get('select');
    if(fields&&fields!=='*')result=result.map(row=>Object.fromEntries(fields.split(',').map(k=>[k,row[k]])));
    reply(result);
  });
  return {server,schools,tops,setLimited(value){limited=value;}};
}
