import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const types = {html:'text/html', js:'text/javascript', css:'text/css', svg:'image/svg+xml'};
const server = http.createServer(async (req,res)=>{
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path.includes('..')) throw new Error('Invalid path');
    const file = path==='/'?'index.html':path.slice(1);
    const data = await readFile(new URL(file,root));
    res.writeHead(200,{'Content-Type':types[file.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'}); res.end(data);
  }catch {res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Birdwire → http://127.0.0.1:4173'));
