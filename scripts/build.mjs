import fs from 'node:fs';
import {build} from 'vite';
const html=fs.readFileSync('worker/page.html','utf8').replace('/*ENGINE*/',fs.readFileSync('worker/engine.js','utf8')).replace('/*CLIENT*/',fs.readFileSync('worker/client.js','utf8'));
fs.writeFileSync('index.html',html);
await build({build:{outDir:'dist',emptyOutDir:true}});
console.log('Built production frontend: dist/index.html');
