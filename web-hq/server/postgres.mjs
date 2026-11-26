import postgres from 'postgres';
const tables=new Set(['questions','addresses','boards','scores','class_teachers','schools','classes','users','sessions','projects','versions','limits','media']);
// SQL comes only from the server's fixed statements. User values remain bound.
export function postgresSql(sql){
 let index=0;
 return sql.replace(/\b(FROM|JOIN|INTO|UPDATE)\s+([a-z_]+)/gi,(match,keyword,table)=>tables.has(table)?`${keyword} studio.${table}`:match).replace(/\?/g,()=>`$${++index}`);
}
function rows(result){return Array.from(result,row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'&&['created','updated','expires','n','revision','count','score'].includes(key)&&/^\d+$/.test(value)?Number(value):value])));}
export function postgresAdapter(client){
 const make=(sql,args=[])=>({
  bind(...values){return make(sql,values);},
  async first(){return rows(await client.unsafe(postgresSql(sql),args))[0]||null;},
  async all(){return {results:rows(await client.unsafe(postgresSql(sql),args))};},
  async run(){const result=await client.unsafe(postgresSql(sql),args);return {success:true,meta:{changes:result.count}};},
  _sql:sql,_values:args
 });
 return {prepare:sql=>make(sql),async batch(statements,options={}){return client.begin(async transaction=>{if(options.accountManagement)await transaction.unsafe('SELECT pg_advisory_xact_lock(72819461)');if(options.activeProject){const active=await transaction.unsafe('SELECT id FROM studio.projects WHERE id=$1 AND trashed=0 FOR UPDATE',[options.activeProject]);if(!active.length)throw Object.assign(new Error('Website unavailable'),{code:'PROJECT_UNAVAILABLE'});}if(options.projectDeletion)await transaction.unsafe('SELECT id FROM studio.projects WHERE id=$1 FOR UPDATE',[options.projectDeletion]);const results=[];for(const s of statements){const result=await transaction.unsafe(postgresSql(s._sql),s._values);results.push({success:true,meta:{changes:result.count}});}return results;});}};
}
const databases=new Map();
export function productionDatabase(connectionString=process.env.DATABASE_URL){
 if(!connectionString)return null;
 if(!databases.has(connectionString))databases.set(connectionString,postgresAdapter(postgres(connectionString,{prepare:false,max:2,max_pipeline:1,fetch_types:false,query_timeout:15,queue_timeout:15,ssl:'require',connect_timeout:10,idle_timeout:20})));
 return databases.get(connectionString);
}
