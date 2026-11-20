import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..','site'),port=Number(process.env.XXT_GUIDE_PORT||4187),prefix='/xuexitong-ai-assistant';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server=createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://127.0.0.1'),path=decodeURIComponent(url.pathname);
  if(path==='/'){response.writeHead(302,{Location:prefix+'/'});response.end();return;}
  if(path!==prefix&&!path.startsWith(prefix+'/')){response.writeHead(404);response.end('Not found');return;}
  const relative=path.slice(prefix.length)||'/',file=resolve(root,'.'+relative+(relative.endsWith('/')?'index.html':''));
  if(file!==root&&!file.startsWith(root+sep)){response.writeHead(403);response.end();return;}
  if(!(await stat(file)).isFile())throw Error('Not a file');
  const bytes=await readFile(file);response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:bytes);
 }catch{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('页面没有找到，请回到使用手册首页。');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}${prefix}/`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
