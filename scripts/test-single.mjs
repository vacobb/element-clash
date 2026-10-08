import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {webcrypto} from 'node:crypto';
const c=vm.createContext({crypto:webcrypto});vm.runInContext(fs.readFileSync('worker/engine.js','utf8')+';globalThis.g={newRoom,addPlayer,start,action,RECIPES};',c);const g=c.g,now=Date.now();
function room(){const s=g.newRoom('TEST23',now);g.addPlayer(s,'A',webcrypto.randomUUID(),now);g.addPlayer(s,'B',webcrypto.randomUUID(),now);g.start(s,now);return s;}
let s=room(),p=s.players[0];p.inv=[2,2,2,2];g.action(s,p,{seq:1,command:{type:'load',recipe:'fireball'}},now);assert.equal(p.items[0],'fireball');let inv=p.inv.join();assert.throws(()=>g.action(s,p,{seq:2,command:{type:'load',recipe:'ice'}},now),/loaded spell/);assert.equal(p.inv.join(),inv);
p.hp=40;g.action(s,p,{seq:3,command:{type:'load',recipe:'heal'}},now);assert.equal(p.hp,60);assert.equal(p.items[0],'fireball');g.action(s,p,{seq:4,command:{type:'load',recipe:'shield'}},now);assert.equal(p.shield,25);assert.equal(p.items[0],'fireball');g.action(s,p,{seq:5,command:{type:'cast',slot:0}},now);assert.equal(p.items[0],null);p.inv=[0,1,0,1];g.action(s,p,{seq:6,command:{type:'load',recipe:'ice'}},now);assert.equal(p.items[0],'ice');
for(const r of g.RECIPES){const t=room(),q=t.players[0];q.inv=Array.from(r.cost);g.action(t,q,{seq:1,command:{type:'load',recipe:r.id}},now);assert.equal(q.inv.reduce((a,b)=>a+b,0),0);assert.equal(q.items.filter(Boolean).length,['heal','shield'].includes(r.kind)?0:1);}
new vm.Script(fs.readFileSync('worker/client.js','utf8'));const client=fs.readFileSync('worker/client.js','utf8');const subset=client.slice(client.indexOf('function suggestedRecipes'),client.indexOf('function craftSuggested'));vm.runInContext('let state={phase:"playing"};'+subset+';globalThis.suggestions=suggestedRecipes',c);for(const inv of [[0,0,0,0],[2,0,0,0],[0,2,0,0],[2,2,2,2]]){const picks=c.suggestions({alive:true,inv,hp:40,shield:0,items:[null,null,null]});assert.equal(picks.length,6);assert(picks.some(r=>['heal','shield'].includes(r.kind)));assert.equal(new Set(picks.map(r=>r.id)).size,6);}
assert(client.includes("document.execCommand('copy')"));assert(client.includes("$('manualcode').select()"));console.log('PASS: single loaded spell, no replacement or ingredient loss, immediate defense preserving loaded attack, cast/refill, all 26 recipes, six unique suggestions including defense, clipboard fallback paths and client syntax.');

const instantRoom=room(),caster=instantRoom.players[0];caster.inv=[4,0,0,0];caster.input={mx:0,my:0,ax:caster.x-200,ay:caster.y,fire:false};g.action(instantRoom,caster,{seq:1,command:{type:'load',recipe:'fireball',instant:true}},now);assert.equal(instantRoom.shots.length,1);assert.equal(caster.items[0],null);assert.equal(caster.inv[0],2);assert.throws(()=>g.action(instantRoom,caster,{seq:2,command:{type:'load',recipe:'fireball',instant:true}},now),/cooldown/);assert.equal(caster.inv[0],2);for(const inv of [[0,0,0,0],[2,2,2,2]])assert(['heal','shield'].includes(c.suggestions({alive:true,inv,hp:40,shield:0})[5].kind));console.log('PASS: atomic immediate casts, cooldown rejection preserves ingredients, defensive recipe fixed in slot 6.');
vm.runInContext('globalThis.isBlocked=blocked',c);
let layouts=new Set();for(let trial=0;trial<100;trial++){
 const t=room();layouts.add(JSON.stringify(t.obstacles));assert.equal(t.sources.length,32);
 for(const p of t.players)assert(!c.isBlocked(p.x,p.y,30,t.obstacles));
 const cells=new Set();for(let y=0;y<25;y++)for(let x=0;x<30;x++)if(!c.isBlocked(20+x*40,20+y*40,16,t.obstacles))cells.add(x+','+y);
 const first=cells.values().next().value,seen=new Set([first]),todo=[first];
 for(let i=0;i<todo.length;i++){const [x,y]=todo[i].split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(x+dx)+','+(y+dy);if(cells.has(key)&&!seen.has(key)){seen.add(key);todo.push(key);}}}
 assert.equal(seen.size,cells.size,'random map must have connected traversable space');
 for(const q of t.sources){assert(!c.isBlocked(q.x,q.y,38,t.obstacles),'ingredient clearance');assert(q.x>=60&&q.x<=1140&&q.y>=60&&q.y<=940);const near=todo.some(key=>{const [x,y]=key.split(',').map(Number);return Math.hypot(q.x-(20+x*40),q.y-(20+y*40))<60;});assert(near,'ingredient must be reachable from connected arena');}
 for(let i=0;i<4;i++)assert.equal(t.sources.filter(q=>q.element===i).length,8);
 const original=JSON.stringify(t.obstacles);g.start(t,now);assert.notEqual(JSON.stringify(t.obstacles),original,'rematch must generate a new layout');
}assert.equal(layouts.size,100);console.log('PASS: 100 random layouts, connected walkable space, obstacle-free player/ingredient spawns, balanced ingredients and fresh rematch maps.');

vm.runInContext('globalThis.advance=advance;globalThis.driveBot=driveTeamBot;globalThis.profiles=BOT_PROFILES',c);
for(const humans of [2,3,4,5,6,7,8])for(const difficulty of ['easy','medium','hard']){
 const t=g.newRoom('BOT123',now);t.settings.mode='teams';t.settings.botDifficulty=difficulty;for(let i=0;i<humans;i++)g.addPlayer(t,'Human'+i,webcrypto.randomUUID(),now);g.start(t,now);
 assert.equal(t.players.filter(p=>p.team===0).length,t.players.filter(p=>p.team===1).length);
 assert.equal(t.players.filter(p=>p.teamBot).length,humans%2);const bot=t.players.find(p=>p.teamBot);if(bot){assert.equal(bot.team,1);assert.equal(bot.difficulty,difficulty);c.advance(t,now+200);assert.equal(bot.seen,now+200);assert(Number.isFinite(bot.x)&&Number.isFinite(bot.y));}
 g.start(t,now+300);assert.equal(t.players.filter(p=>p.teamBot).length,humans%2,'rematches cannot accumulate bots');
 t.settings.mode='survival';g.start(t,now+400);assert.equal(t.players.filter(p=>p.teamBot).length,0,'bots only balance team mode');
}
let bRoom=g.newRoom('AI1234',now);bRoom.settings.mode='teams';for(let i=0;i<3;i++)g.addPlayer(bRoom,'Human'+i,webcrypto.randomUUID(),now);g.start(bRoom,now);const bot=bRoom.players.find(p=>p.teamBot);const human=bRoom.players[0];bot.x=500;bot.y=500;human.x=620;human.y=500;bRoom.obstacles=[];
const counts=[];for(const difficulty of ['easy','medium','hard']){bot.difficulty=difficulty;let firing=0;for(let i=0;i<100;i++){bRoom.t=i/50;bot.inv=[2,2,2,2];bot.hp=100;bot.shield=40;bot.attackAt=9999;bot.nextBrain=0;c.driveBot(bRoom,bot,now);if(bot.input.fire)firing++;}counts.push(firing);}assert(counts[0]<counts[1]&&counts[1]<counts[2],'difficulty increases firing aggression');
const oldHost=bRoom.host;bRoom.players.filter(p=>!p.teamBot).forEach(p=>p.seen=now-5000);c.advance(bRoom,now+200);assert.equal(bRoom.host,oldHost,'computer cannot become host');
console.log('PASS: 2–8-human team balancing, all difficulties, bot simulation, clean rematches/mode changes, human-only hosting and increasing aggression.');
