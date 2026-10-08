import {zipFunctions} from '@netlify/zip-it-and-ship-it';
import fs from 'node:fs';
fs.mkdirSync('artifacts/functions',{recursive:true});
const results=await zipFunctions('netlify/functions','artifacts/functions',{
 config:{'*':{nodeBundler:'esbuild'}},
 manifest:'artifacts/functions/manifest.json',
});
if(results.length!==1||results[0].name!=='game')throw Error('Expected exactly one game function');
fs.writeFileSync('artifacts/function-build.json',JSON.stringify(results,null,2));
console.log('Packaged game function with Netlify bundler:',results[0].path);
