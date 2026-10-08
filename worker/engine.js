const ELEMENTS=['fire','water','earth','air'];
const COLORS=['#b4a1ff','#61dbc9','#ffad70','#ef81b4','#93c9ff','#e6dc77','#99df87','#dfb7ff'];
const RECIPES=[];
function recipe(id,name,cost,kind,description,extra={}){RECIPES.push({id,name,cost,kind,description,tier:cost.reduce((a,b)=>a+b,0),...extra});}
recipe('fireball','Fireball',[2,0,0,0],'bolt','25 damage · aimed projectile',{damage:25,speed:460,range:570});
recipe('steam','Steam Burst',[1,1,0,0],'cone','18 damage · close steam cloud',{damage:18,range:150});
recipe('mine','Ember Mine',[1,0,1,0],'mine','28 damage · proximity trap',{damage:28,range:160});
recipe('flame','Flame Cone',[1,0,0,1],'cone','20 damage · wide frontal attack',{damage:20,range:180});
recipe('heal','Healing Potion',[0,2,0,0],'heal','Restore 20 health · 10s potion cooldown',{heal:20});
recipe('frost','Frost Patch',[0,1,1,0],'zone','Slow opponents in a frost field',{slow:true,range:340,radius:85,duration:5});
recipe('ice','Ice Bolt',[0,1,0,1],'bolt','15 damage · slows for 2 seconds',{damage:15,slow:true,speed:430,range:570});
recipe('shield','Stone Shield',[0,0,2,0],'shield','Absorb 25 damage for 5 seconds',{shield:25});
recipe('shock','Shockwave',[0,0,1,1],'wave','15 damage · push nearby opponents',{damage:15,range:125});
recipe('dash','Wind Dash',[0,0,0,2],'dash','Dash 150 units toward your aim',{range:150});
for(const r of [...RECIPES]){const cost=[...r.cost];const idx=r.id==='ice'?3:cost.indexOf(Math.max(...cost));cost[idx]++;recipe('greater-'+r.id,r.id==='ice'?'Swift Ice Bolt':'Greater '+r.name,cost,r.kind,'Upgraded '+r.name.toLowerCase(),{...r,id:'greater-'+r.id,name:r.id==='ice'?'Swift Ice Bolt':'Greater '+r.name,cost,tier:3,damage:r.damage?Math.round(r.damage*1.4):undefined,heal:r.heal?35:undefined,shield:r.shield?40:undefined,range:r.range?Math.round(r.range*1.2):undefined,radius:r.radius?110:undefined,speed:r.speed?600:undefined,duration:r.duration?7:undefined});}
recipe('meteor','Meteor',[2,0,2,0],'meteor','45 damage · 1.1s warning · area impact',{damage:45,range:440,radius:95,warning:1.1});
recipe('blizzard','Blizzard',[0,2,0,2],'zone','8 damage/s + slow · lasts 5 seconds',{damage:8,slow:true,range:410,radius:115,duration:5,warning:.7});
recipe('sanctuary','Sanctuary',[0,2,2,0],'zone','Heal anyone inside 8 health/s for 5s',{heal:8,range:280,radius:95,duration:5,warning:.4});
recipe('flame-dash','Flame Dash',[1,0,1,2],'dash','Dash 190 units · leave a burning trail',{range:190,damage:12});
recipe('firestorm','Firestorm',[2,0,1,2],'zone','14 damage/s · 1.5s warning · lasts 5s',{damage:14,range:460,radius:150,duration:5,warning:1.5});
recipe('fortress','Fortress',[0,1,3,1],'shield','Absorb 65 damage for 7s · move slower',{shield:65,fortress:true});
const OBSTACLES=[{x:295,y:240,w:100,h:45},{x:805,y:240,w:100,h:45},{x:295,y:715,w:100,h:45},{x:805,y:715,w:100,h:45},{x:530,y:370,w:45,h:100},{x:625,y:530,w:45,h:100},{x:130,y:470,w:80,h:60},{x:990,y:470,w:80,h:60}];
function uid(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function blocked(x,y,r=14,obstacles=OBSTACLES){return x<r||y<r||x>1200-r||y>1000-r||obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
function move(p,dx,dy,s){if(!blocked(p.x+dx,p.y,14,s.obstacles))p.x+=dx;if(!blocked(p.x,p.y+dy,14,s.obstacles))p.y+=dy;}
function spawnPlayer(p,i,n,s){let angle=i/n*Math.PI*2;p.x=600+Math.cos(angle)*420;p.y=500+Math.sin(angle)*340;
// Spawn with clear space for the player's radius and their first movement step.
if(blocked(p.x,p.y,34,s.obstacles)){
 const desired={x:p.x,y:p.y};let found=false;
 for(let ring=32;ring<=400&&!found;ring+=16)for(let direction=0;direction<16;direction++){
  const a=direction*Math.PI/8,x=desired.x+Math.cos(a)*ring,y=desired.y+Math.sin(a)*ring;
  if(!blocked(x,y,34,s.obstacles)){p.x=x;p.y=y;found=true;break;}
 }
}
p.hp=100;p.alive=true;p.shield=0;p.shieldUntil=0;p.slowUntil=0;p.inv=[0,0,0,0];p.items=[null,null,null];p.kills=0;p.damage=0;p.deathAt=0;p.attackAt=0;p.potionAt=0;p.specialAt=0;p.input={mx:0,my:0,ax:p.x,ay:p.y,fire:false};}
function randomArena(){
 const cells=[];
 for(let row=0;row<4;row++)for(let col=0;col<5;col++){
  const cx=180+col*210,cy=170+row*210;
  if(Math.hypot(cx-600,cy-500)<190)continue;
  cells.push({cx,cy});
 }
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 return cells.slice(0,8+Math.floor(Math.random()*4)).map(({cx,cy})=>{
  const horizontal=Math.random()<.5,w=horizontal?85+Math.random()*35:40+Math.random()*15,h=horizontal?40+Math.random()*15:85+Math.random()*35;
  return {x:Math.round(cx-w/2+(Math.random()-.5)*25),y:Math.round(cy-h/2+(Math.random()-.5)*25),w:Math.round(w),h:Math.round(h)};
 });
}
function openIngredientPoint(s){
 for(let tries=0;tries<3000;tries++){
  const point={x:60+Math.random()*1080,y:60+Math.random()*880};
  if(!blocked(point.x,point.y,38,s.obstacles)&&s.sources.every(q=>dist(point,q)>48)&&s.players.every(p=>dist(point,p)>65))return point;
 }
 for(let y=60;y<940;y+=50)for(let x=60;x<1140;x+=50)if(!blocked(x,y,38,s.obstacles)&&s.sources.every(q=>dist({x,y},q)>40))return {x,y};
 throw Error('Could not place a reachable ingredient.');
}
function newRoom(code,now){return {code,obstacles:OBSTACLES.map(o=>({...o})),phase:'lobby',host:null,players:[],t:0,last:now,started:0,round:0,shots:[],zones:[],pickups:[],sources:[],events:[],results:[],settings:{mode:'survival',pace:1,supplies:true,botDifficulty:'medium'},nextDrop:40,revision:0};}
function addPlayer(s,name,token,now){if(s.players.filter(p=>!p.teamBot).length>=8)throw Error('This room is full (8 players).');let p={id:uid(),token,name:name.slice(0,18)||'Wizard',color:COLORS[s.players.filter(p=>!p.teamBot).length],seen:now,seq:0,ready:false,spectator:s.phase==='playing'};spawnPlayer(p,s.players.length,8,s);if(p.spectator)p.alive=false;s.players.push(p);if(!s.host)s.host=p.id;return p;}
function start(s,now){let ps=s.players.filter(p=>!p.teamBot&&now-p.seen<30000);if(ps.length<2)throw Error('You need at least two connected players.');if(s.settings.mode==='teams'&&ps.length%2){ps.push({id:uid(),token:uid(),name:'Computer ('+(s.settings.botDifficulty||'medium')+')',color:COLORS[ps.length],seen:now,seq:0,ready:true,teamBot:true,difficulty:s.settings.botDifficulty||'medium'});}s.players=ps;s.phase='playing';s.started=now;s.last=now;s.t=0;s.round++;s.shots=[];s.zones=[];s.pickups=[];s.results=[];s.events=[];s.nextDrop=40;s.sources=[];s.obstacles=randomArena();ps.forEach((p,i)=>{spawnPlayer(p,i,ps.length,s);p.spectator=false;p.seq=0;p.team=i%2;p.spawnProtection=2;});
for(let i=0;i<32;i++){
 const point=openIngredientPoint(s);
 s.sources.push({...point,element:i%4,respawn:0});
}

}
function enemies(s,a,b){return a.id!==b.id&&b.alive&&!(s.settings.mode==='teams'&&a.team===b.team);}
function hit(s,target,amount,owner){if(!target.alive||target.spawnProtection>s.t)return;let absorbed=Math.min(target.shield||0,amount);target.shield-=absorbed;amount-=absorbed;let dealt=Math.min(target.hp,amount);target.hp-=dealt;let p=s.players.find(p=>p.id===owner);if(p)p.damage+=dealt;if(target.hp<=0){target.hp=0;target.alive=false;target.deathAt=s.t;target.respawnAt=s.t+4;if(p&&p.id!==target.id)p.kills++;let n=0;for(let i=0;i<4;i++)while(target.inv[i]>0&&n<4){target.inv[i]--;s.pickups.push({id:uid(),element:i,x:target.x,y:target.y});n++;}s.events.unshift({t:s.t,text:target.name+' was eliminated'+(p?' by '+p.name:' by the storm')});s.events=s.events.slice(0,5);}}
function aim(p,input,range){let dx=input.ax-p.x,dy=input.ay-p.y,len=Math.hypot(dx,dy)||1;return {dx:dx/len,dy:dy/len,x:p.x+dx/len*Math.min(range,len),y:p.y+dy/len*Math.min(range,len)};}
function cast(s,p,r){const a=aim(p,p.input,r.range||500);if(r.kind==='heal'){if(s.t<p.potionAt)throw Error('Potion is cooling down.');p.hp=Math.min(100,p.hp+r.heal);p.potionAt=s.t+10;}
else if(r.kind==='shield'){p.shield=Math.max(p.shield,r.shield);p.shieldUntil=s.t+(r.fortress?7:5);p.fortress=!!r.fortress;}
else if(r.kind==='bolt'){s.shots.push({id:uid(),x:p.x+a.dx*22,y:p.y+a.dy*22,vx:a.dx*r.speed,vy:a.dy*r.speed,life:r.range/r.speed,damage:r.damage,slow:r.slow,owner:p.id,color:r.cost[0]?'#ff9166':'#83dcff'});}
else if(r.kind==='cone'||r.kind==='wave'){for(const q of s.players){if(!enemies(s,p,q))continue;const d=dist(p,q),dot=((q.x-p.x)*a.dx+(q.y-p.y)*a.dy)/(d||1);if(d<r.range&&(r.kind==='wave'||dot>.55)){hit(s,q,r.damage,p.id);if(r.kind==='wave')move(q,(q.x-p.x)/(d||1)*55,(q.y-p.y)/(d||1)*55,s);}}s.zones.push({id:uid(),kind:'flash',x:p.x,y:p.y,radius:r.range,owner:p.id,start:s.t,end:s.t+.25,color:r.kind==='wave'?'#e9d493':'#ff9166'});}
else if(r.kind==='dash'){const old={x:p.x,y:p.y};for(let i=0;i<r.range;i+=8)move(p,a.dx*8,a.dy*8,s);if(r.damage)for(let i=0;i<5;i++)s.zones.push({id:uid(),kind:'zone',x:old.x+(p.x-old.x)*i/4,y:old.y+(p.y-old.y)*i/4,radius:35,damage:r.damage,owner:p.id,start:s.t,end:s.t+3,color:'#ff9166'});}
else{s.zones.push({id:uid(),kind:r.kind,x:a.x,y:a.y,radius:r.radius||52,damage:r.damage,heal:r.heal,slow:r.slow,owner:p.id,start:s.t+(r.warning||0),end:s.t+(r.warning||0)+(r.duration||(r.kind==='mine'?30:.1)),color:r.heal?'#73e1b5':r.slow?'#83dcff':'#ff9166'});}
}
function action(s,p,a,now){p.seen=now;if(a.input){let i=a.input;p.input={mx:clamp(Number(i.mx)||0,-1,1),my:clamp(Number(i.my)||0,-1,1),ax:clamp(Number(i.ax)||p.x,0,1200),ay:clamp(Number(i.ay)||p.y,0,1000),fire:!!i.fire};}
if(!a.command)return;if(!Number.isSafeInteger(a.seq)||a.seq<=p.seq)return;p.seq=a.seq;
const c=a.command;if(c.type==='ready')p.ready=!p.ready;
if(c.type==='settings'){if(s.host!==p.id||s.phase==='playing')throw Error('Only the host can change lobby settings.');s.settings={mode:['survival','teams','skirmish'].includes(c.mode)?c.mode:'survival',pace:[.85,1,1.15].includes(c.pace)?c.pace:1,supplies:c.supplies!==false,botDifficulty:['easy','medium','hard'].includes(c.botDifficulty)?c.botDifficulty:'medium'};}
if(c.type==='start'){if(s.phase==='playing')throw Error('A battle is already in progress.');if(s.host!==p.id)throw Error('Only the host can start.');start(s,now);return;}
if(s.phase!=='playing'||!p.alive)return;
if(c.type==='craft'||c.type==='load'){
 if(c.aim&&Number.isFinite(c.aim.ax)&&Number.isFinite(c.aim.ay)){p.input.ax=clamp(c.aim.ax,0,1200);p.input.ay=clamp(c.aim.ay,0,1000);}
 const r=RECIPES.find(r=>r.id===c.recipe);if(!r)throw Error('Unknown recipe.');
 const defensive=r.kind==='heal'||r.kind==='shield';const instant=c.instant===true;
 if(instant&&!defensive&&s.t<p.attackAt)throw Error('Wait for the cast cooldown.');
 if(instant&&r.tier>=4&&s.t<p.specialAt)throw Error('Power spell is cooling down.');
 if(!defensive&&p.items[0])throw Error('Cast your loaded spell before loading another.');
 if(r.cost.some((v,i)=>p.inv[i]<v))throw Error('Collect the required ingredients first.');
 if(defensive&&r.kind==='heal'&&s.t<p.potionAt)throw Error('Potion is cooling down.');
 if(defensive&&r.tier>=4&&s.t<p.specialAt)throw Error('Power spell is cooling down.');
 r.cost.forEach((v,i)=>p.inv[i]-=v);
 if(defensive){cast(s,p,r);if(r.tier>=4)p.specialAt=s.t+4;}else if(instant){cast(s,p,r);p.attackAt=s.t+.55;if(r.tier>=4)p.specialAt=s.t+4;}else p.items=[r.id,null,null];
}
if(c.type==='cast'){const slot=Number(c.slot);const r=RECIPES.find(r=>r.id===p.items[slot]);if(!r)return;if(s.t<p.attackAt)throw Error('Wait for the cast cooldown.');if(r.tier>=4&&s.t<p.specialAt)throw Error('Power spell is cooling down.');cast(s,p,r);p.items[slot]=null;p.attackAt=s.t+.55;if(r.tier>=4)p.specialAt=s.t+4;}
if(c.type==='discard'){p.items[clamp(Number(c.slot)||0,0,2)]=null;}
}
function finish(s){s.phase='finished';s.results=[...s.players.filter(p=>!p.spectator)].sort((a,b)=>s.settings.mode==='skirmish'?b.kills-a.kills||b.damage-a.damage:Number(b.alive)-Number(a.alive)||b.deathAt-a.deathAt).map(p=>({id:p.id,name:p.name,color:p.color,alive:p.alive,team:p.team,kills:p.kills,damage:Math.round(p.damage),deathAt:p.deathAt}));let living=s.results.filter(p=>p.alive);s.winner=s.settings.mode==='skirmish'?s.results[0]?.name:s.settings.mode==='teams'?(living.length?'Team '+(living[0].team===0?'Sun':'Moon'):'Draw'):living.length===1?living[0].name:'Draw';}
const BOT_PROFILES={easy:{think:.9,chase:320,gatherDistance:220,fireDuty:.35,healAt:55,jitter:.2},medium:{think:.5,chase:240,gatherDistance:360,fireDuty:.7,healAt:40,jitter:.09},hard:{think:.22,chase:160,gatherDistance:500,fireDuty:1,healAt:28,jitter:.025}};
function clearRoute(s,a,b){const n=Math.ceil(dist(a,b)/15);for(let i=1;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,16,s.obstacles))return false;return true;}
function botRoute(s,p,target){
 if(clearRoute(s,p,target))return [{x:target.x,y:target.y}];
 const free=[];for(let y=0;y<25;y++)for(let x=0;x<30;x++){const q={x:20+x*40,y:20+y*40,key:y*30+x};if(!blocked(q.x,q.y,16,s.obstacles))free.push(q);}
 const nearest=a=>free.reduce((best,q)=>!best||dist(a,q)<dist(a,best)?q:best,null);
 const origin=nearest(p),goal=nearest(target);if(!origin||!goal)return [];
 const cells=new Map(free.map(q=>[q.key,q])),parent=new Map([[origin.key,null]]),queue=[origin.key];
 for(let i=0;i<queue.length&&!parent.has(goal.key);i++){const key=queue[i],x=key%30,y=Math.floor(key/30);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(x+dx<0||x+dx>=30||y+dy<0||y+dy>=25)continue;const next=(y+dy)*30+x+dx;if(cells.has(next)&&!parent.has(next)){parent.set(next,key);queue.push(next);}}}
 if(!parent.has(goal.key))return [];
 const path=[];for(let key=goal.key;key!==null;key=parent.get(key))path.unshift(cells.get(key));return [...path,{x:target.x,y:target.y}];
}
function driveTeamBot(s,p,now){
 p.seen=now;if(!p.alive){p.input={mx:0,my:0,fire:false,ax:p.x,ay:p.y};return;}
 const profile=BOT_PROFILES[p.difficulty]||BOT_PROFILES.medium;
 const enemiesList=s.players.filter(q=>enemies(s,p,q)).sort((a,b)=>dist(p,a)-dist(p,b));const target=enemiesList[0];
 if(!target){p.input={mx:0,my:0,fire:false,ax:p.x,ay:p.y};return;}
 const distance=dist(p,target);
 if(s.t>=(p.nextBrain||0)){
  p.nextBrain=s.t+profile.think;
  const reachable=RECIPES.filter(r=>r.cost.every((n,i)=>p.inv[i]>=n));
  const defense=reachable.find(r=>r.kind==='heal'&&p.hp<profile.healAt&&s.t>=p.potionAt)||reachable.find(r=>r.kind==='shield'&&p.shield<5&&distance<350&&(r.tier<4||s.t>=p.specialAt));
  const attack=reachable.filter(r=>r.damage&&r.kind!=='mine'&&r.kind!=='dash'&&distance<(r.range||0)&&s.t>=p.attackAt&&(r.tier<4||s.t>=p.specialAt)).sort((a,b)=>b.tier-a.tier)[0];
  p.input={...p.input,ax:target.x,ay:target.y};const spell=defense||attack;
  if(spell){spell.cost.forEach((n,i)=>p.inv[i]-=n);cast(s,p,spell);if(!defense)p.attackAt=s.t+.55;if(spell.tier>=4)p.specialAt=s.t+4;}
  let goal=target;
  const pickups=[...s.sources.filter(q=>q.respawn<=s.t),...s.pickups].sort((a,b)=>dist(p,a)-dist(p,b));
  if(p.inv.reduce((a,b)=>a+b,0)<6&&pickups.length&&(distance>profile.gatherDistance||p.inv.reduce((a,b)=>a+b,0)<2))goal=pickups[0];
  else if(p.hp<profile.healAt&&distance<180){const dx=p.x-target.x,dy=p.y-target.y,len=Math.hypot(dx,dy)||1;goal={x:clamp(p.x+dx/len*140,40,1160),y:clamp(p.y+dy/len*140,40,960)};}
  else if(distance<profile.chase)goal={x:p.x,y:p.y};
  if(s.radius<760&&dist(p,{x:600,y:500})>s.radius-65)goal={x:600,y:500};
  p.botPath=botRoute(s,p,goal);
 }
 while(p.botPath?.length&&dist(p,p.botPath[0])<18)p.botPath.shift();
 const waypoint=p.botPath?.[0];const dx=waypoint?waypoint.x-p.x:0,dy=waypoint?waypoint.y-p.y:0,len=Math.hypot(dx,dy)||1;
 const angle=Math.atan2(target.y-p.y,target.x-p.x)+Math.sin(s.t*2+p.team)*profile.jitter;
 p.input={mx:dx/len,my:dy/len,ax:p.x+Math.cos(angle)*distance,ay:p.y+Math.sin(angle)*distance,fire:distance<500&&(s.t%2)/2<profile.fireDuty&&clearRoute(s,p,target)};
}
function advance(s,now){let elapsed=Math.max(0,(now-s.last)/1000);s.last=now;const connected=s.players.filter(p=>!p.teamBot&&now-p.seen<3000);if(connected.length&&!connected.some(p=>p.id===s.host))s.host=connected[0].id;
if(s.phase!=='playing')return;const dtTotal=Math.min(elapsed,.8);const steps=Math.ceil(dtTotal/(1/30));for(let step=0;step<steps;step++){let dt=dtTotal/steps;s.t+=dt;const stormStart=90/s.settings.pace;const radius=s.settings.mode==='skirmish'?760:Math.max(0,760-(Math.max(0,s.t-stormStart)*4.4*s.settings.pace));s.radius=radius;
for(const p of s.players){if(p.teamBot)driveTeamBot(s,p,now);if(p.spectator)continue;if(!p.alive){if(s.settings.mode==='skirmish'&&s.t>=p.respawnAt&&now-p.seen<30000){let kills=p.kills,damage=p.damage;spawnPlayer(p,s.players.indexOf(p),s.players.length,s);p.kills=kills;p.damage=damage;p.spawnProtection=s.t+2;}continue;}if(now-p.seen>30000){hit(s,p,2000,null);continue;}if(p.shieldUntil<s.t)p.shield=0;
const input=now-p.seen<700?p.input:{mx:0,my:0,fire:false};let len=Math.hypot(input.mx,input.my);let speed=190*s.settings.pace*(p.slowUntil>s.t?.55:1)*(p.shield&&p.fortress?.65:1);if(len)move(p,input.mx/Math.max(1,len)*speed*dt,input.my/Math.max(1,len)*speed*dt,s);
if(input.fire&&s.t>=p.attackAt){let a=aim(p,p.input,480);s.shots.push({id:uid(),x:p.x+a.dx*22,y:p.y+a.dy*22,vx:a.dx*540,vy:a.dy*540,life:.9,damage:5,owner:p.id,color:p.color});p.attackAt=s.t+.38;}
for(const source of s.sources)if(s.t>=source.respawn&&dist(p,source)<29&&p.inv.reduce((a,b)=>a+b,0)<8){p.inv[source.element]++;source.respawn=s.t+7/s.settings.pace;}
for(const pickup of s.pickups)if(!pickup.taken&&dist(p,pickup)<28&&p.inv.reduce((a,b)=>a+b,0)<8){p.inv[pickup.element]++;pickup.taken=true;}
if(dist(p,{x:600,y:500})>radius)hit(s,p,12*dt,null);
}
s.pickups=s.pickups.filter(p=>!p.taken);
for(const b of s.shots){b.life-=dt;let x=b.x+b.vx*dt,y=b.y+b.vy*dt;if(blocked(x,y,3,s.obstacles)){b.life=0;continue;}b.x=x;b.y=y;let owner=s.players.find(p=>p.id===b.owner);for(const q of s.players)if(owner&&enemies(s,owner,q)&&dist(q,b)<20){hit(s,q,b.damage,b.owner);if(b.slow)q.slowUntil=s.t+2;b.life=0;break;}}
s.shots=s.shots.filter(b=>b.life>0);
for(const z of s.zones){if(z.start>s.t||z.end<s.t||z.kind==='flash')continue;let owner=s.players.find(p=>p.id===z.owner);if(z.kind==='mine'){if(s.players.some(p=>owner&&enemies(s,owner,p)&&dist(z,p)<z.radius)){for(const q of s.players)if(owner&&enemies(s,owner,q)&&dist(z,q)<z.radius+25)hit(s,q,z.damage,z.owner);z.end=0;}continue;}
for(const q of s.players){if(!q.alive||dist(q,z)>z.radius)continue;if(z.heal)q.hp=Math.min(100,q.hp+z.heal*dt);if(owner&&enemies(s,owner,q)){if(z.damage)hit(s,q,z.kind==='meteor'?z.damage:z.damage*dt,z.owner);if(z.slow)q.slowUntil=s.t+.2;}}
if(z.kind==='meteor')z.end=0;
}
// Water and ice fields extinguish overlapping burning ground and mines.
for(const wet of s.zones.filter(z=>z.slow&&s.t>=z.start))for(const hot of s.zones)if(hot.color==='#ff9166'&&hot.kind!=='meteor'&&dist(wet,hot)<wet.radius+hot.radius)hot.end=0;
s.zones=s.zones.filter(z=>z.end>s.t);
if(s.settings.supplies&&s.t>=s.nextDrop){s.nextDrop+=40;s.events.unshift({t:s.t,text:'Supply drop at the arena center!'});for(let i=0;i<8;i++)s.pickups.push({id:uid(),x:600+Math.cos(i*Math.PI/4)*80,y:500+Math.sin(i*Math.PI/4)*80,element:i%4});}
const alive=s.players.filter(p=>p.alive&&!p.spectator);if(s.settings.mode==='skirmish'){if(s.t>=180)finish(s);}else if(s.settings.mode==='teams'?new Set(alive.map(p=>p.team)).size<=1:alive.length<=1)finish(s);if(s.phase==='finished')break;
}
s.revision++;
}
function publicState(s){return {...s,players:s.players.map(({token,input,seq,...p})=>p)};}
