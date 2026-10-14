import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='/Little-House-Flower/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.txt':'text/plain'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:5590');
  if(!url.pathname.startsWith(base)){res.writeHead(404).end();return;}
  let relative;
  try{relative=decodeURIComponent(url.pathname.slice(base.length));}catch{res.writeHead(400).end();return;}
  if(relative.split('/').some(part=>part.startsWith('.'))){res.writeHead(404).end();return;}
  let file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(404).end();return;}
  try{
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    const size=fs.statSync(file).size;let start=0,end=size-1,status=200;
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    if(req.headers.range){const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(!match){res.writeHead(416).end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):end;if(start>end){res.writeHead(416).end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file,{start,end}).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
}).listen(5590,'127.0.0.1',()=>console.log('GitHub Pages preview: http://127.0.0.1:5590/Little-House-Flower/'));
