import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync('worker/engine.js','utf8')+'\n'+fs.readFileSync('worker/client.js','utf8');
const markup=fs.readFileSync('worker/page.html','utf8');
function storage(map=new Map()){return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function makeClient(shared,base){
 let time=Date.now(),intervals=new Map(),intervalId=0,listeners=new Map();
 const document={activeElement:{tagName:'BODY'},getElementById:id=>elements.get(id)};
 class Element{
  constructor(id){this.id=id;this.command='';this.tagName=id==='battle'?'CANVAS':'BUTTON';this.style={};this.listeners=new Map();this.textContent='';this.value='';this.disabled=false;this.checked=true;this.html='';this.writes=0;this.clientWidth=1200;this.clientHeight=1000;this.width=1200;this.height=1000;const set=new Set();this.classList={add:k=>set.add(k),remove:k=>set.delete(k),contains:k=>set.has(k),toggle:(k,on)=>on?set.add(k):set.delete(k)};}
  set innerHTML(v){this.html=v;this.writes++;}get innerHTML(){return this.html;}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  focus(){document.activeElement=this;}
  querySelector(){return {style:{}};}
  getBoundingClientRect(){return {left:0,top:0,width:110,height:110};}
  getContext(){return new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
  setPointerCapture(){}
 }
 const elements=new Map([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
 for(const m of markup.matchAll(/<[^>]*class="[^"]*hidden[^"]*"[^>]*id="([^"]+)"/g))elements.get(m[1])?.classList.add('hidden');
 const ctx=vm.createContext({crypto:webcrypto,console,document,localStorage:storage(shared),sessionStorage:storage(),Date:class extends Date{static now(){return time;}},performance:{now:()=>time},devicePixelRatio:1,matchMedia:()=>({matches:false}),navigator:{clipboard:{writeText:async()=>{}}},fetch:(path,opts)=>fetch(base+path,opts),requestAnimationFrame:()=>{},setInterval:fn=>{let id=++intervalId;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),setTimeout:()=>1,clearTimeout:()=>{},addEventListener:(kind,fn)=>listeners.set(kind,fn)});
 ctx.window=ctx;vm.runInContext(source,ctx);
 const evaluate=code=>vm.runInContext(code,ctx);
 return {ctx,elements,evaluate,event:(kind,e)=>listeners.get(kind)?.({preventDefault(){},...e}),tick(){time+=34;evaluate('frame('+time+')');for(const fn of [...intervals.values()])fn();},click(id){const el=elements.get(id);assert(!el.disabled,id+' must be enabled');const m=markup.match(new RegExp('id="'+id+'"[^>]*onclick="([^"]+)"'));assert(m,'handler missing: '+id);ctx.button=el;return evaluate('(function(){with(button){'+m[1]+'}}).call(button)');}};
}

const phone=makeClient(new Map(),'http://unused');phone.ctx.matchMedia=()=>({matches:true});
phone.evaluate("practice();state.obstacles=[];me().x=500;me().y=500;state.players.filter(p=>p.id!==myId).forEach((p,i)=>{p.alive=i===0;p.x=650;p.y=500;});me().inv=[2,0,0,0];renderHUD();updateTarget();syncBasicAttack()");
function pointer(id,type,pointerId,x=100,y=55){const el=phone.elements.get(id);el.listeners.get(type)?.({type,pointerType:'touch',pointerId,clientX:x,clientY:y,currentTarget:el,preventDefault(){},stopPropagation(){}});}
assert.equal(phone.evaluate('input.fire'),false,'target alone never fires basic attack');
assert.equal(phone.evaluate('input.ax'),650);
pointer('moveStick','pointerdown',11);
pointer('suggestion0','pointerdown',22);
assert(phone.evaluate('state.shots.length')>0,'second finger casts immediately');
assert.equal(phone.evaluate('me().items[0]'),null);assert(phone.evaluate('moveTouch.x')>0);
pointer('basicbtn','pointerdown',44);assert.equal(phone.evaluate('input.fire'),true);
pointer('basicbtn','pointerup',22);assert.equal(phone.evaluate('input.fire'),true,'unrelated touch does not stop basic attack');
pointer('basicbtn','pointerup',44);assert.equal(phone.evaluate('input.fire'),false);
phone.evaluate('selectOpponent({clientX:650,clientY:500})');assert(phone.evaluate('lockedTarget')!==null);
phone.evaluate('selectOpponent({clientX:800,clientY:800})');assert.equal(phone.evaluate('lockedTarget'),null);
phone.event('keydown',{key:' '});assert.equal(phone.evaluate('input.fire'),true);phone.event('keyup',{key:' '});assert.equal(phone.evaluate('input.fire'),false);
phone.evaluate('state.players.filter(p=>p.id!==myId).forEach(p=>p.alive=false);me().inv=[2,0,0,0];craftSuggested("fireball")');assert.equal(phone.evaluate('me().inv[0]'),2,'no target consumes no ingredients');
phone.evaluate(`state.settings.mode='teams';me().team=0;const q=state.players.find(p=>p.id!==myId);q.alive=true;q.team=0;assertTarget=resolveTarget(state,me(),null,null,480);`);assert.equal(phone.evaluate('assertTarget'),null,'teammates excluded');
phone.evaluate('state.players.find(p=>p.id!==myId).team=1;state.obstacles=[{x:560,y:450,w:40,h:100}];assertTarget=resolveTarget(state,me(),null,null,480)');assert.equal(phone.evaluate('assertTarget'),null,'cover excluded');
phone.evaluate('state.obstacles=[];assertTarget=resolveTarget(state,me(),null,null,100)');assert.equal(phone.evaluate('assertTarget'),null,'out of range excluded');
phone.event('blur',{});assert.equal(phone.evaluate('moveTouch'),null);assert.equal(phone.evaluate('input.fire'),false);
console.log('PASS: automatic target eligibility, lock/clear, manual-only basic attacks, simultaneous touch movement/casting, cancellation and no-target ingredient preservation.');

phone.evaluate('state.obstacles=[];state.settings.mode="battle";const enemy=state.players.find(p=>p.id!==myId);enemy.alive=true;enemy.x=1000;enemy.y=500;me().inv=[8,8,8,8];me().attackAt=0;me().specialAt=0;state.t=10;renderHUD();refreshSpellAvailability()');
assert.equal(phone.evaluate('spellInRange(RECIPES.find(r=>r.id==="fireball"))'),true);
assert.equal(phone.evaluate('spellInRange(RECIPES.find(r=>r.id==="blizzard"))'),false);
phone.evaluate('$("suggestion0").recipeId="fireball";$("suggestion1").recipeId="blizzard";refreshSpellAvailability()');
assert.equal(phone.elements.get('suggestion0').disabled,false);assert(phone.elements.get('suggestion0').classList.contains('castready'));
assert.equal(phone.elements.get('suggestion1').disabled,true);assert.equal(phone.elements.get('suggestdest1').textContent,'Out of range');
phone.evaluate('state.players.find(p=>p.id!==myId).x=800;refreshSpellAvailability()');assert.equal(phone.elements.get('suggestion1').disabled,false);
phone.evaluate('state.players.find(p=>p.id!==myId).x=1100;refreshSpellAvailability()');assert.equal(phone.elements.get('suggestion0').disabled,true);
assert.equal(phone.evaluate('spellInRange(RECIPES.find(r=>r.id==="heal"))'),true);
console.log('PASS: per-spell live range gating/highlighting, movement into/out of range, and defensive independence.');

assert.equal(phone.elements.get('suggestion0').classList.contains('castready'),false,'leaving range clears highlight class');
phone.evaluate('state.players.find(p=>p.id!==myId).x=650;refreshSpellAvailability()');assert(phone.elements.get('suggestion0').classList.contains('castready'));
phone.evaluate('state.players.find(p=>p.id!==myId).x=1100;frame(performance.now()+16)');assert.equal(phone.elements.get('suggestion0').classList.contains('castready'),false,'animation frame clears stale highlight');
assert(markup.includes('button:not(:disabled):hover'),'disabled buttons cannot inherit global hover highlight');
assert(markup.includes('.quick button:disabled:hover')&&markup.includes('.quick button:disabled:focus'),'disabled hover and focus explicitly use inactive appearance');
console.log('PASS: range exit clears highlight every frame, including disabled hover/focus styling.');
