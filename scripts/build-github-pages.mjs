import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]||path.join(root,'hosted-backend/public'));
const base='/Little-House-Flower';
const release='intro-reload-20261014-1';
const textTypes=new Set(['.html','.css','.js','.mjs','.json','.webmanifest','.txt']);
const filenames=['site.css','upgrade.css','polish.css','customizer.css','customizer.mjs','logo-intro.css','hosted-context.js','storefront.js'];

async function exportDirectory(directory,relative=''){
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const rel=path.join(relative,entry.name),from=path.join(directory,entry.name),to=path.join(root,rel);
    // Preserve the shop's legacy configuration; the demo only uses its own API.
    if(rel==='sheet.json')continue;
    if(entry.isDirectory()){await fs.mkdir(to,{recursive:true});await exportDirectory(from,rel);continue;}
    if(!textTypes.has(path.extname(entry.name))){await fs.copyFile(from,to);continue;}
    let text=await fs.readFile(from,'utf8');
    // Only asset/API literals change; hash-router route names remain unchanged.
    text=text.replace(/(["'`(=\s])\/(api|img|media|shared|studio)\//g,`$1${base}/$2/`);
    text=text.replace(/(["'`(])img\//g,`$1${base}/img/`);
    for(const name of filenames)text=text.replaceAll('/'+name,base+'/'+name);
    // Preserve the narrow image allowlists with the GitHub project prefix.
    text=text.replaceAll('^\\/img\\/','^\\/Little-House-Flower\\/img\\/').replaceAll('^\\/api\\/','^\\/Little-House-Flower\\/api\\/');
    if(rel==='studio/app-shell.mjs')text=text.replace("&& !window.LHF_NATIVE_APP)","&& !window.LHF_NATIVE_APP && !window.LHF_PAGES_APP)");
    if(rel==='hosted-context.js')text=`window.LHF_SHARE_CONTEXT=Object.freeze({mode:'github-pages',customerURL:'${base}/',studioURL:'${base}/studio/'});\n`;
    if(rel==='index.html'){
      text=text.replace('</head>',`<script defer src="${base}/pages-access.js?v=${release}"></script></head>`);
      text=text.replace(/<script[^>]+src="[^\"]*(?:hosted-context|storefront)\.js"[^>]*><\/script>/g,'');
    }
    if(rel==='studio/index.html'){
      text=text.replace(/<script[^>]+src="[^\"]+"[^>]*><\/script>/g,'');
      text=text.replace('</head>',`<script defer src="${base}/pages-access.js?v=${release}"></script></head>`);
    }
    if(path.extname(rel)==='.html')text=text.replace(/(href="\/Little-House-Flower\/[^"?]+\.css)"/g,`$1?v=${release}"`);
    if(['.js','.mjs'].includes(path.extname(rel)))text=text.replace(/(from\s+['"]|import\(['"])([^'"?]+\.m?js)(['"])/g,`$1$2?v=${release}$3`);
    await fs.writeFile(to,text);
  }
}
await exportDirectory(source);
await fs.writeFile(path.join(root,'.nojekyll'),'');
await fs.writeFile(path.join(root,'404.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Little House Flower</title><body><p>This page has moved. <a href="${base}/">Open Little House Flower</a></p></body></html>\n`);
console.log('Exported storefront and Studio for '+base+'/');
