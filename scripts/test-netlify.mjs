import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {getStore,setEnvironmentContext} from '@netlify/blobs';
import http from 'node:http';
import {createGameHandler} from '../lib/game-handler.js';

// The official local BlobsServer omits read ETags. Use a protocol emulator
// that supplies ETags and atomically enforces If-Match/If-None-Match.
// The unmodified production Netlify SDK sends actual HTTP requests to it.
const entries=new Map();let revision=0;
const service=http.createServer(async(req,res)=>{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const key=req.url,old=entries.get(key);
 if(req.method==='GET'){
  if(!old){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'etag':old.etag,'content-type':'application/json'});res.end(old.body);return;
 }
 if(req.method==='PUT'){
  if((req.headers['if-none-match']==='*'&&old)||(req.headers['if-match']&&req.headers['if-match']!==old?.etag)){res.writeHead(412);res.end();return;}
  const etag='"'+(++revision)+'"';entries.set(key,{body:Buffer.concat(chunks).toString(),etag});res.writeHead(200,{etag});res.end();return;
 }
 res.writeHead(405);res.end();
});
await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
const port=service.address().port;
setEnvironmentContext({siteID:'test-site',token:'test-token',edgeURL:`http://127.0.0.1:${port}`,uncachedEdgeURL:`http://127.0.0.1:${port}`});
const store=()=>getStore({name:'element-clash-rooms',consistency:'strong'});
let time=Date.now(),seq=1;
const originalNow=Date.now;Date.now=()=>time;
const unpack=path.resolve('artifacts/verify-unpacked');fs.mkdirSync(unpack,{recursive:true});
execFileSync('unzip',['-oq','artifacts/functions/game.zip','-d',unpack]);
const packed=(await import(pathToFileURL(path.join(unpack,'netlify/functions/game.mjs')).href)).default;
const handler=packed; // All three rounds exercise the actual Netlify package.

async function call(data,fn=handler,expected=200){
 const response=await fn(new Request('https://game.test/.netlify/functions/game',{method:'POST',body:JSON.stringify(data)}));
 const value=await response.json();assert.equal(response.status,expected,JSON.stringify(value));return value;
}
const tokenA=crypto.randomUUID(),tokenB=crypto.randomUUID();
try{
 const created=await call({type:'create',token:tokenA,name:'Aster'}),code=created.state.code;
 assert.match(code,/^[A-Z0-9]{6}$/);
 await call({type:'join',code,token:tokenB,name:'Briar'});
 const sync=(token,extra={})=>call({type:'sync',code,token,...extra});
 await call({type:'sync',code,token:tokenB,seq:seq++,command:{type:'start'}},handler,400);
 // Confirm method and auth handling separately.
 assert.equal((await handler(new Request('https://game.test/.netlify/functions/game'))).status,405);
 await call({type:'sync',code,token:crypto.randomUUID()},handler,401);
 const roundResults=[];
 for(let round=1;round<=3;round++){
  await sync(tokenB);
  const started=await sync(tokenA,{seq:seq++,command:{type:'start'}});
  assert.equal(started.state.round,round);assert.equal(started.state.phase,'playing');
  // Deterministic open firing lane: combat itself runs entirely through HTTP inputs,
  // real projectile collision, normal health/damage/elimination and finish logic.
  const blob=await store().getWithMetadata('rooms/'+code,{type:'json'}),s=blob.data;
  s.obstacles=[];s.sources=[];s.pickups=[];
  s.players.forEach((p,i)=>{p.x=500+i*120;p.y=500;p.spawnProtection=0;p.inv=[2,2,2,2];});
  assert((await store().setJSON('rooms/'+code,s,{onlyIfMatch:blob.etag})).modified);
  const attacker=round===2?tokenB:tokenA,defender=round===2?tokenA:tokenB;
  const ax=round===2?500:620;
  // Craft a real Fireball, then use manually held basic attacks to finish.
  await sync(attacker,{seq:seq++,command:{type:'load',recipe:'fireball',instant:true,aim:{ax,ay:500}},input:{mx:0,my:0,ax,ay:500,fire:false}});
  let finished;
  for(let tick=0;tick<200;tick++){
   time+=100;
   await sync(defender,{input:{mx:0,my:0,ax:500,ay:500,fire:false}});
   finished=await sync(attacker,{input:{mx:0,my:0,ax,ay:500,fire:true}});
   if(finished.state.phase==='finished')break;
  }
  assert.equal(finished.state.phase,'finished');
  const winner=round===2?'Briar':'Aster';assert.equal(finished.state.winner,winner);
  const scores=finished.state.results;assert.equal(scores.length,2);assert.equal(scores[0].name,winner);
  assert.equal(scores[0].kills,1);assert.equal(scores[0].damage,100);assert.equal(scores[1].kills,0);
  assert(finished.state.players.every(p=>!('token'in p)&&!('input'in p)&&!('seq'in p)));
  const spectator=await sync(defender);assert.equal(spectator.state.winner,winner);
  roundResults.push({round,winner,scores});
  time+=100;
 }
 assert.equal(roundResults[2].winner,'Aster');
 // Conditional-write retry: force one losing writer, then replay the same command.
 let conflicts=0;const retryStore={getWithMetadata:(...a)=>store().getWithMetadata(...a),set:async(...a)=>{if(!conflicts++){return {modified:false};}return store().set(...a);}};
 const retry=createGameHandler(()=>retryStore,()=>time);
 const ready={type:'sync',code,token:tokenA,seq:seq++,command:{type:'ready'}};
 const first=await call(ready,retry),replayed=await call(ready,retry);
 assert.equal(first.state.players[0].ready,replayed.state.players[0].ready);assert(conflicts>=2);
 // Direct conditional writes verify SDK rejects stale revisions.
 const old=await store().getWithMetadata('rooms/'+code,{type:'json'});
 assert((await store().setJSON('rooms/'+code,{...old.data,revision:77},{onlyIfMatch:old.etag})).modified);
 assert.equal((await store().setJSON('rooms/'+code,old.data,{onlyIfMatch:old.etag})).modified,false);
 const concurrentTokens=[crypto.randomUUID(),crypto.randomUUID()];
 const joins=await Promise.all(concurrentTokens.map((token,i)=>call({type:'join',code,token,name:'Concurrent '+i})));
 const joined=await sync(tokenA);assert.equal(joined.state.players.length,4);
 assert(joins.every(result=>result.playerId));
 // Packaged function: extract Netlify-produced archive and execute its actual module.
 const packedRoom=await call({type:'create',token:crypto.randomUUID(),name:'Packed wizard'},packed);
 assert.equal(packedRoom.state.phase,'lobby');
 await call({type:'join',code:packedRoom.state.code,token:crypto.randomUUID(),name:'Packed partner'},packed);
 const html=fs.readFileSync('dist/index.html','utf8');
 assert(html.includes("fetch('/.netlify/functions/game'"));assert(!html.includes("fetch('/api/"));assert(!html.includes('/*ENGINE*/'));assert(!html.includes('/*CLIENT*/'));
 const functionSource=fs.readFileSync('netlify/functions/game.ts','utf8');assert(!/config\s*\.\s*path/.test(functionSource));
 assert.deepEqual(fs.readdirSync('netlify/functions'),['game.ts']);
 fs.writeFileSync('artifacts/test-results.json',JSON.stringify({passed:true,rounds:roundResults,finalWinner:roundResults[2].winner,storage:'real Netlify SDK + ETag-enforcing HTTP Blobs protocol emulator',packagedFunction:'three complete rounds plus create/join passed',productionFrontend:'direct endpoint and scripts verified',liveDeploymentTested:false},null,2));
 console.log('PASS: two players, three completed rounds, real Fireball/basic combat, scores 1 elimination/100 damage, third-round winner Aster; ETag conflict retries, idempotency, packed function create/join, production frontend.');
}finally{Date.now=originalNow;await new Promise(resolve=>service.close(resolve));}
