(()=>{"use strict";
if(globalThis.__FATEBOUND_BATTLE_EXCITEMENT_V1__)return;
globalThis.__FATEBOUND_BATTLE_EXCITEMENT_V1__=true;

const EXC_VERSION=1;
const EXC_ORDER_INTERVAL=45000;
const EXC_ORDER_DURATION=35000;
const EXC_SURGE_MS=12000;
const EXC_CAPTURE_BUFF_MS=8000;

function exState(){
  if(!M)return null;
  let e=M.excitement;
  if(!e||e.version!==EXC_VERSION){
    e=M.excitement={
      version:EXC_VERSION,
      momentum:[0,0],surgeUntil:[0,0],captureBuffUntil:[0,0],
      captureTimes:[[],[]],prevLeaders:M.towers?M.towers.map(t=>towerLeader(t)):[],
      nextOrderAt:(M.startAt||Date.now())+EXC_ORDER_INTERVAL,order:null,orderCount:0,lastOrderType:null,
      biggestHit:null,lastCapture:null,clutchCapture:null,suddenTargets:[],lastPhase:null,
      rivalId:null,rivalPickAt:0,lastAlertKey:"",lastAlertAt:0,heroMomentAt:0,finalThirtyShown:false
    };
  }
  e.momentum ||= [0,0];e.surgeUntil ||= [0,0];e.captureBuffUntil ||= [0,0];e.captureTimes ||= [[],[]];
  e.prevLeaders ||= M.towers.map(t=>towerLeader(t));e.suddenTargets ||= [];
  return e;
}
function battleActive(){return !!(M&&!M.lobby&&!M.ended&&inWar()&&!M.inBoss);}
function guildName(sd){return sd===0?"BRASS COMPANY":"CRIMSON VOW";}
function safeEnterTower(ti){
  if(!battleActive()||ti==null||ti<0||ti>=M.towers.length)return;
  if(typeof QTE!=="undefined"&&QTE)return;
  const rb=$("roll");if(rb&&rb.classList.contains("busy"))return;
  enterTower(ti);
}
function addMomentum(sd,amount,reason=""){
  if(!battleActive())return;
  const e=exState(),now=Date.now();
  e.momentum[sd]=Math.max(0,Math.min(100,(e.momentum[sd]||0)+amount));
  if(e.momentum[sd]>=100){
    e.momentum[sd]=15;e.surgeUntil[sd]=now+EXC_SURGE_MS;
    bigBanner(sd===0?"BRASS SURGE!":"CRIMSON SURGE!",sd===0?"+10% attack for 12 seconds":"Enemy attack +10% for 12 seconds");
    feed(`${guildName(sd)} fills Momentum — 12 second surge!`,sd===0?"rally":"flip bad");
    if(sd===0&&navigator.vibrate)navigator.vibrate([18,35,18]);
  }else if(reason&&amount>=15&&sd===0){
    feed(`Momentum +${amount}: ${reason}`,"rally");
  }
}
function boostForSide(sd){
  const e=exState(),now=Date.now();let m=1;
  if(e&&now<(e.surgeUntil[sd]||0))m*=1.10;
  if(e&&now<(e.captureBuffUntil[sd]||0))m*=1.05;
  return m;
}
function teamTriples(sd){return side(sd).reduce((n,h)=>n+(h.triples||0),0);}

function ensureUi(){
  if($("battleExcitement"))return;
  const style=document.createElement("style");
  style.id="battleExcitementStyle";
  style.textContent=`
#battleExcitement{position:fixed;z-index:1880;left:50%;top:calc(env(safe-area-inset-top,0px) + 52px);transform:translateX(-50%);width:min(94vw,500px);pointer-events:none;font-family:Nunito,system-ui,sans-serif;color:#fff}
#battlePulse{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;padding:5px 8px;border:1px solid #ffffff22;background:#09131bd9;box-shadow:0 6px 24px #0008;border-radius:10px;backdrop-filter:blur(8px)}
#battlePulse .side{display:grid;gap:3px;font-size:9px;font-weight:900;letter-spacing:.08em}.momtrack{height:6px;border-radius:8px;background:#ffffff18;overflow:hidden}.momfill{height:100%;width:0;transition:width .25s ease}.us .momfill{background:linear-gradient(90deg,#38b9df,#88e7ff)}.foe .momfill{background:linear-gradient(90deg,#ff874b,#e7462c)}#battlePulse .foe{text-align:right}.surging{animation:excPulse .55s ease-in-out infinite alternate}
#battlePulse .mid{font-size:9px;font-weight:1000;color:#ffd66f;white-space:nowrap;text-align:center}
#battleOrder,#battleAlert,#rivalChip{pointer-events:auto;margin-top:6px;border:1px solid #d5a95a66;background:linear-gradient(180deg,#172732ef,#0b151def);box-shadow:0 7px 22px #0009;border-radius:10px}
#battleOrder{padding:8px 9px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}#battleOrder b{display:block;font-size:11px;color:#ffd66f;letter-spacing:.08em}#battleOrder span{font-size:10px;color:#e5eef3}#battleOrder small{display:block;color:#93a9b6;font-size:9px;margin-top:2px}#battleOrder button,#battleAlert button,#rivalChip button{border:1px solid #ffd66f88;background:#283d49;color:#ffe4a4;font-weight:900;border-radius:7px;padding:6px 9px;font-size:10px}
#battleAlert{padding:7px 8px;display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;border-color:#ff8a5d88}#battleAlert b{font-size:11px;color:#ffb08c}#battleAlert span{display:block;font-size:9px;color:#dce7ec}
#rivalChip{position:absolute;right:0;top:48px;width:145px;padding:5px;display:grid;grid-template-columns:34px 1fr;gap:6px;align-items:center}#rivalChip canvas{width:34px;height:34px;border-radius:50%;border:1px solid #ff9a6a;background:#16232c}#rivalChip b{font-size:9px;color:#ffb08c;display:block}#rivalChip span{font-size:9px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#rivalChip small{font-size:8px;color:#92a8b5}
#heroMoment{position:fixed;z-index:2150;left:50%;top:27%;transform:translate(-50%,-50%) scale(.82);opacity:0;pointer-events:none;display:grid;grid-template-columns:58px auto;gap:10px;align-items:center;min-width:230px;padding:9px 14px;border:1px solid #ffd66f88;border-radius:14px;background:radial-gradient(circle at 20% 20%,#5a4526ee,#0b1117f5 70%);box-shadow:0 0 40px #ffcf5570;transition:opacity .15s,transform .2s}
#heroMoment.show{opacity:1;transform:translate(-50%,-50%) scale(1)}#heroMoment canvas{width:58px;height:58px;border-radius:50%;background:#17242c;border:2px solid #ffd66f}#heroMoment b{display:block;font-size:18px;line-height:1;color:#ffe19a;text-shadow:0 2px 0 #000}#heroMoment span{font-size:10px;color:#edf4f6}
#battleAtmos{position:fixed;inset:0;z-index:1700;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(circle at 50% 100%,#ff5c2630,transparent 52%),linear-gradient(180deg,transparent 55%,#ff6a2930);mix-blend-mode:screen}
body.final-assault #battleAtmos{opacity:.8;animation:excAtmos 1.5s ease-in-out infinite alternate}body.final-thirty #battleAtmos{opacity:1;background:radial-gradient(circle at 50% 100%,#ffb12f44,transparent 48%),linear-gradient(180deg,transparent 45%,#d52d2044)}
body.sudden-death #battleAtmos{opacity:1;background:radial-gradient(circle at 50% 45%,#ffe36a38,transparent 42%),linear-gradient(180deg,#6b142222,transparent 50%,#6b142244)}
body.final-assault #clock,body.final-assault #lead{transform:scale(1.08);text-shadow:0 0 12px #ffb13c}body.sudden-death #clock{animation:excPulse .35s ease-in-out infinite alternate;color:#ffe477!important}
#whHex button.sudden{outline:2px solid #ffe477;box-shadow:0 0 16px #ffc52f;animation:excPulse .5s ease-in-out infinite alternate}
#battle.hero-moment{animation:heroCam .52s cubic-bezier(.2,.8,.2,1)}
#matchHighlights{margin:10px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}#matchHighlights .mh{min-width:0;padding:7px;border:1px solid #ffffff1f;border-radius:10px;background:#0f1c24;text-align:center}#matchHighlights canvas{width:54px;height:54px;border-radius:50%;background:#17242c}#matchHighlights b{display:block;font-size:9px;color:#ffd66f;letter-spacing:.04em}#matchHighlights strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#matchHighlights small{display:block;font-size:8px;color:#91a7b3}
@keyframes excPulse{from{filter:brightness(1)}to{filter:brightness(1.45)}}@keyframes excAtmos{from{filter:saturate(1)}to{filter:saturate(1.6) brightness(1.15)}}@keyframes heroCam{0%{filter:brightness(1);transform:scale(1)}35%{filter:brightness(1.15);transform:scale(1.012)}100%{filter:brightness(1);transform:scale(1)}}
@media(max-width:420px){#battleExcitement{top:calc(env(safe-area-inset-top,0px) + 45px)}#rivalChip{top:44px;width:125px}#battlePulse{padding:4px 6px}#matchHighlights{gap:4px}#matchHighlights .mh{padding:5px}}
`;
  document.head.appendChild(style);
  const root=document.createElement("div");root.id="battleExcitement";root.hidden=true;
  root.innerHTML=`<div id="battlePulse"><div class="side us"><span>BRASS MOMENTUM</span><div class="momtrack"><div class="momfill" id="momUs"></div></div></div><div class="mid" id="phaseChip">BATTLE</div><div class="side foe"><span>CRIMSON MOMENTUM</span><div class="momtrack"><div class="momfill" id="momFoe"></div></div></div></div><div id="battleOrder" hidden><div><b id="orderTitle">BATTLE ORDER</b><span id="orderText"></span><small id="orderProgress"></small></div><button id="orderGo" hidden>GO</button></div><div id="battleAlert" hidden><div><b id="alertTitle"></b><span id="alertText"></span></div><button id="alertGo">GO</button></div><div id="rivalChip" hidden><canvas id="rivalPortrait" width="80" height="80"></canvas><div><b id="rivalLabel">RIVAL</b><span id="rivalName"></span><small id="rivalInfo"></small></div></div>`;
  document.body.appendChild(root);
  const hero=document.createElement("div");hero.id="heroMoment";hero.innerHTML=`<canvas id="heroMomentPortrait" width="128" height="128"></canvas><div><b id="heroMomentTitle"></b><span id="heroMomentSub"></span></div>`;document.body.appendChild(hero);
  const atm=document.createElement("div");atm.id="battleAtmos";document.body.appendChild(atm);
  $("orderGo").onclick=()=>{const o=exState()?.order;if(o&&Number.isInteger(o.target))safeEnterTower(o.target);};
  $("alertGo").onclick=()=>{const ti=Number($("battleAlert").dataset.tower);if(Number.isInteger(ti))safeEnterTower(ti);};
  $("rivalChip").onclick=()=>{const id=exState()?.rivalId,h=id?byId(id):null;if(h)safeEnterTower(heroTower(h));};
}
function showHeroMoment(title,sub,h=player){
  if(!battleActive())return;ensureUi();const e=exState(),now=Date.now();e.heroMomentAt=now;
  $("heroMomentTitle").textContent=title;$("heroMomentSub").textContent=sub||"";
  try{drawCharPortrait($("heroMomentPortrait"),h?.char||0,h?.weapon||0);}catch(_){}
  const box=$("heroMoment");box.classList.add("show");$("battle")?.classList.add("hero-moment");
  clearTimeout(box._hide);box._hide=setTimeout(()=>{box.classList.remove("show");$("battle")?.classList.remove("hero-moment");},650);
}

function chooseOrder(){
  const e=exState(),types=["capture","kos","shields","triples","hold"];
  let idx=e.orderCount%types.length,type=types[idx];if(type===e.lastOrderType)type=types[(idx+1)%types.length];
  const now=Date.now(),o={type,startedAt:now,endsAt:now+EXC_ORDER_DURATION,lastCheck:now};
  if(type==="capture"){
    const candidates=M.towers.filter(t=>towerLeader(t)!==0).sort((a,b)=>b.pts-a.pts||Math.abs(a.dmg[0]-a.dmg[1])-Math.abs(b.dmg[0]-b.dmg[1]));
    if(!candidates.length)type=o.type="kos";else{o.target=candidates[0].id;o.need=1;o.text=`Take Tower ${candidates[0].name} (${candidates[0].pts}♛)`;}
  }
  if(type==="kos"){o.base=M.tally[0].kos;o.need=2;o.text="Score 2 guild knockouts";}
  if(type==="shields"){o.base=M.tally[0].shields;o.need=4;o.text="Break 4 enemy shields";}
  if(type==="triples"){o.base=teamTriples(0);o.need=3;o.text="Roll 3 guild triples";}
  if(type==="hold"){o.need=15;o.heldMs=0;o.text="Hold 2 valuable towers for 15s";}
  e.order=o;e.orderCount++;e.lastOrderType=type;e.nextOrderAt=now+EXC_ORDER_INTERVAL;
  bigBanner("BATTLE ORDER",o.text);feed(`Battle Order: ${o.text}`,"rally");
}
function orderProgress(o,now){
  if(o.type==="capture")return towerLeader(M.towers[o.target])===0?1:0;
  if(o.type==="kos")return Math.max(0,M.tally[0].kos-o.base);
  if(o.type==="shields")return Math.max(0,M.tally[0].shields-o.base);
  if(o.type==="triples")return Math.max(0,teamTriples(0)-o.base);
  if(o.type==="hold"){
    const dt=Math.max(0,Math.min(500,now-(o.lastCheck||now)));o.lastCheck=now;
    const held=M.towers.filter(t=>t.pts>=2&&towerLeader(t)===0).length;
    if(held>=2)o.heldMs=(o.heldMs||0)+dt;
    return Math.floor((o.heldMs||0)/1000);
  }
  return 0;
}
function tickOrders(now){
  const e=exState();if(!e||!battleActive())return;
  const left=M.endAt-now;
  if(left<=30000){if(e.order){feed("Final 30 seconds — tower control only.","rally");e.order=null;}return;}
  if(!e.order&&now>=(e.nextOrderAt||0)){chooseOrder();return;}
  const o=e.order;if(!o)return;
  const p=orderProgress(o,now);o.progress=p;
  if(p>=o.need){
    e.order=null;addMomentum(0,22,"Battle Order complete");gainGold(player,75);
    bigBanner("ORDER COMPLETE","+75 gold · +22 Momentum");toast("Battle Order complete: +75 gold · Momentum boosted","reward");
    return;
  }
  if(now>=o.endsAt){
    feed(`Battle Order expired: ${o.text}`,"flip bad");e.order=null;e.nextOrderAt=Math.max(e.nextOrderAt,now+10000);
  }
}
function paintOrder(now){
  const e=exState(),box=$("battleOrder"),o=e?.order;if(!box)return;
  if(!battleActive()||!o||M.endAt-now<=30000){box.hidden=true;return;}box.hidden=false;
  $("orderText").textContent=o.text;
  const p=Math.min(o.need,o.progress||0),secs=Math.max(0,Math.ceil((o.endsAt-now)/1000));
  $("orderProgress").textContent=`${p}/${o.need} · ${secs}s · reward +75 gold / +22 Momentum`;
  $("orderGo").hidden=!Number.isInteger(o.target);
}
function recordCapture(sd,t,now){
  const e=exState(),left=M.endAt-now;e.lastCapture={side:sd,tower:t.id,at:now};
  addMomentum(sd,18,`Tower ${t.name} captured`);
  e.captureTimes[sd]=(e.captureTimes[sd]||[]).filter(x=>now-x<30000);e.captureTimes[sd].push(now);
  const streak=e.captureTimes[sd].length;
  if(streak>=2){
    e.captureBuffUntil[sd]=Math.max(e.captureBuffUntil[sd]||0,now+EXC_CAPTURE_BUFF_MS);
    addMomentum(sd,streak>=3?15:10,`${streak}-tower capture streak`);
    bigBanner(`${streak} TOWERS TAKEN — ${sd===0?"ADVANCE!":"HOLD THEM!"}`,sd===0?"+5% attack for 8 seconds":"Enemy capture streak: +5% attack");
    if(sd===0&&navigator.vibrate)navigator.vibrate([15,25,15]);
  }
  if(left<=30000){
    e.clutchCapture={side:sd,tower:t.id,at:now};
    bigBanner(sd===0?"CLUTCH CAPTURE!":"CLUTCH LOSS!",`Tower ${t.name} flips with ${Math.ceil(left/1000)}s left`);
    SFX.horn?.();shakeScreen(sd===0?6:8,360);document.body.classList.add("final-thirty");
    if(sd===0)showHeroMoment("CLUTCH CAPTURE",`Tower ${t.name} · ${Math.ceil(left/1000)}s left`,player);
  }
}
function threat(){
  if(!battleActive())return null;const e=exState();
  if(typeof warOvertime==="function"&&warOvertime()){
    const ids=e.suddenTargets||[];if(ids.length){const names=ids.map(i=>M.towers[i].name).join(" · ");return{key:"sd:"+ids.join(","),title:"SUDDEN DEATH TARGETS",text:`Next lead ends it · Towers ${names}`,tower:ids[0]};}
  }
  const scored=M.towers.map(t=>{const d=t.dmg[0]-t.dmg[1],tot=Math.max(1,t.dmg[0]+t.dmg[1]),closeness=Math.abs(d)/tot;return{t,d,tot,closeness,lead:towerLeader(t)};}).filter(x=>x.tot>0);
  const danger=scored.filter(x=>x.lead===0&&x.closeness<.18&&x.t.pts>=2).sort((a,b)=>b.t.pts-a.t.pts||a.closeness-b.closeness)[0];
  if(danger)return{key:"d:"+danger.t.id,title:`TOWER ${danger.t.name} IN DANGER`,text:`${danger.t.pts}♛ objective · enemy is close to flipping it`,tower:danger.t.id};
  const push=scored.filter(x=>x.lead===1&&x.closeness<.18&&x.t.pts>=2).sort((a,b)=>b.t.pts-a.t.pts||a.closeness-b.closeness)[0];
  if(push)return{key:"p:"+push.t.id,title:`TOWER ${push.t.name} WEAKENED`,text:`${push.t.pts}♛ objective · push now to flip it`,tower:push.t.id};
  return null;
}
function paintThreat(now){
  const box=$("battleAlert");if(!box)return;const a=threat(),e=exState();
  if(!a){box.hidden=true;return;}box.hidden=false;box.dataset.tower=a.tower;$("alertTitle").textContent=a.title;$("alertText").textContent=a.text;$("alertGo").textContent=a.key.startsWith("d:")?"DEFEND":a.key.startsWith("p:")?"PUSH":"GO";
  if(e.lastAlertKey!==a.key&&now-(e.lastAlertAt||0)>8000){e.lastAlertKey=a.key;e.lastAlertAt=now;feed(a.title+": "+a.text,a.key.startsWith("d:")?"flip bad":"rally");}
}
function pickRival(now){
  const e=exState();if(!e||!battleActive())return null;
  if(player.rival&&byId(player.rival)){e.rivalId=player.rival;return byId(player.rival);}
  if(e.rivalId&&byId(e.rivalId)&&now<(e.rivalPickAt||0))return byId(e.rivalId);
  const foes=side(1).slice().sort((a,b)=>(b.damage+b.kos*300)-(a.damage+a.kos*300));const r=foes[0]||null;
  if(r){e.rivalId=r.id;e.rivalPickAt=now+10000;}return r;
}
function paintRival(now){
  const chip=$("rivalChip");if(!chip)return;const h=pickRival(now);
  if(!battleActive()||!h){chip.hidden=true;return;}chip.hidden=false;
  const personal=player.rival===h.id;$("rivalLabel").textContent=personal?"REVENGE TARGET":"RIVAL";$("rivalName").textContent=h.name;
  $("rivalInfo").textContent=`${h.kos} KO · ${fmtK(h.damage)} dmg${h.bounty?" · BOUNTY":""}`;
  if(chip.dataset.hero!==h.id){chip.dataset.hero=h.id;try{drawCharPortrait($("rivalPortrait"),h.char||0,h.weapon||0);}catch(_){}}
}
function paintMomentum(now){
  const e=exState();if(!e)return;$("momUs").style.width=`${e.momentum[0]||0}%`;$("momFoe").style.width=`${e.momentum[1]||0}%`;
  $("momUs").classList.toggle("surging",now<(e.surgeUntil[0]||0));$("momFoe").classList.toggle("surging",now<(e.surgeUntil[1]||0));
  let phase="OPENING";if(typeof warOvertime==="function"&&warOvertime())phase="SUDDEN DEATH";else if(typeof warBattle==="function"&&warBattle())phase="FINAL ASSAULT";else if(war()?.pressureAt&&now>=war().pressureAt)phase="PRESSURE";
  $("phaseChip").textContent=phase;
}
function paintSuddenTargets(){
  if(!$("whHex"))return;const ids=new Set(exState()?.suddenTargets||[]);
  $("whHex").querySelectorAll("button[data-t]").forEach(b=>b.classList.toggle("sudden",ids.has(+b.dataset.t)));
}
function beginSuddenTargets(){
  const e=exState();const ranked=M.towers.map(t=>{const tot=t.dmg[0]+t.dmg[1]||1;return{t,close:Math.abs(t.dmg[0]-t.dmg[1])/tot};}).sort((a,b)=>a.close-b.close||b.t.pts-a.t.pts);
  e.suddenTargets=ranked.slice(0,3).map(x=>x.t.id);
  const names=e.suddenTargets.map(i=>M.towers[i].name).join(" · ");
  bigBanner("NEXT CAPTURE COULD END IT",`Priority towers: ${names}`);feed(`Sudden death targets: Towers ${names}. First guild to take the lead wins.`,"rally");
}
function paintPhase(now){
  const active=battleActive(),root=$("battleExcitement");if(root)root.hidden=!active;
  const final=active&&typeof warBattle==="function"&&warBattle()&&!(typeof warOvertime==="function"&&warOvertime());
  const sudden=active&&typeof warOvertime==="function"&&warOvertime();const left=active?M.endAt-now:999999;
  document.body.classList.toggle("final-assault",!!final);document.body.classList.toggle("final-thirty",!!final&&left<=30000);document.body.classList.toggle("sudden-death",!!sudden);
  const e=exState();if(active&&final&&left<=30000&&!e.finalThirtyShown){e.finalThirtyShown=true;bigBanner("30 SECONDS","No side objectives · every tower matters");SFX.horn?.();feed("Final 30 seconds — focus on tower control.","rally");}
}
function renderHighlights(){
  const e=exState();if(!e||!$("endRewards"))return;
  let wrap=$("matchHighlights");if(!wrap){wrap=document.createElement("div");wrap.id="matchHighlights";$("endRewards").insertAdjacentElement("beforebegin",wrap);}
  const allies=side(0),mvp=allies.slice().sort((a,b)=>b.damage-a.damage)[0]||player;
  const big=e.biggestHit||{hero:player.id,amount:0};const bh=byId(big.hero)||player;
  const cap=e.clutchCapture||e.lastCapture;const capHero=cap?(cap.side===0?allies:side(1)).slice().sort((a,b)=>b.damage-a.damage)[0]:player;
  wrap.innerHTML=`<div class="mh"><canvas width="110" height="110" data-h="big"></canvas><b>BIGGEST HIT</b><strong>${big.amount?fmtK(big.amount):"—"}</strong><small>${bh.name}</small></div><div class="mh"><canvas width="110" height="110" data-h="cap"></canvas><b>${e.clutchCapture?"CLUTCH CAPTURE":"TOWER SWING"}</b><strong>${cap?"Tower "+M.towers[cap.tower].name:"—"}</strong><small>${cap?guildName(cap.side):"No late flip"}</small></div><div class="mh"><canvas width="110" height="110" data-h="mvp"></canvas><b>MVP</b><strong>${mvp.name}</strong><small>${fmtK(mvp.damage)} damage</small></div>`;
  try{drawCharPortrait(wrap.querySelector('[data-h="big"]'),bh.char||0,bh.weapon||0);drawCharPortrait(wrap.querySelector('[data-h="cap"]'),capHero?.char||0,capHero?.weapon||0);drawCharPortrait(wrap.querySelector('[data-h="mvp"]'),mvp.char||0,mvp.weapon||0);}catch(_){}
}

ensureUi();

const coreNewMatch=newMatch;
newMatch=function(...args){const out=coreNewMatch(...args);if(M){M.excitement=null;exState();}return out;};

const coreFinaleBoost=finaleBoost;
finaleBoost=function(){
  const base=coreFinaleBoost();if(!M||!inWar()||M.inBoss)return base;
  const sd=Number.isInteger(M._excSide)?M._excSide:0;return base*boostForSide(sd);
};

const coreApplyRoll=applyRoll;
applyRoll=function(who,faces,mult){
  const beforeD=who?.damage||0,beforeT=who?.triples||0;if(M)M._excSide=who?.side??0;
  let out;try{out=coreApplyRoll(who,faces,mult);}finally{if(M)delete M._excSide;}
  if(battleActive()&&who){
    const e=exState(),delta=Math.max(0,(who.damage||0)-beforeD);
    if(delta>(e.biggestHit?.amount||0))e.biggestHit={hero:who.id,amount:delta,at:Date.now()};
    if((who.triples||0)>beforeT){addMomentum(who.side,7,"triple");if(who===player)showHeroMoment("TRIPLE!","+7 guild Momentum",who);}
  }
  return out;
};

const coreKnockOut=knockOut;
knockOut=function(who,h,T){
  const wasGuild=battleActive(),rivalBefore=player?.rival;const out=coreKnockOut(who,h,T);
  if(wasGuild&&who&&h){
    addMomentum(who.side,12,"knockout");
    const e=exState();if(h===player&&who.side===1){e.rivalId=who.id;e.rivalPickAt=Date.now()+30000;showHeroMoment("RIVAL FORGED",`${who.name} took you down`,who);}
    if(who===player){const revenge=rivalBefore===h.id;showHeroMoment(revenge?"REVENGE!":"TAKEDOWN",revenge?`${h.name} rival defeated`:`${h.name} knocked out`,who);if(revenge)addMomentum(0,10,"rival revenge");}
  }
  return out;
};

if(typeof callRally==="function"){
  const coreCallRally=callRally;
  callRally=function(sd,ti,...rest){const before=M?.ralliesLeft?.[sd];const out=coreCallRally(sd,ti,...rest);if(battleActive()&&Number.isFinite(before)&&M.ralliesLeft[sd]<before)addMomentum(sd,8,"rally called");return out;};
}

const coreEventsTick=eventsTick;
eventsTick=function(now){
  const e=exState(),before=e?.prevLeaders?.slice()||[];const out=coreEventsTick(now);
  if(battleActive()){
    const after=M.towers.map(t=>towerLeader(t));after.forEach((lead,i)=>{const old=before[i];if(old>=0&&lead>=0&&lead!==old)recordCapture(lead,M.towers[i],now);});e.prevLeaders=after;
  }
  return out;
};

const coreWarTick=warTick;
warTick=function(){
  const before=battleActive()&&typeof warOvertime==="function"&&warOvertime();const out=coreWarTick();
  if(battleActive()){const after=typeof warOvertime==="function"&&warOvertime();if(after&&!before)beginSuddenTargets();}
  return out;
};

const coreRenderWarHead=renderWarHead;
renderWarHead=function(...args){const out=coreRenderWarHead(...args);paintSuddenTargets();return out;};

const coreUpdateHud=updateHud;
let excPaintAt=0;
updateHud=function(...args){
  const out=coreUpdateHud(...args),now=Date.now();if(now-excPaintAt<180)return out;excPaintAt=now;
  ensureUi();if(M){exState();tickOrders(now);paintPhase(now);if(battleActive()){paintMomentum(now);paintOrder(now);paintThreat(now);paintRival(now);paintSuddenTargets();}}
  return out;
};

const coreFinishMatch=finishMatch;
finishMatch=function(...args){const wasGuild=battleActive();const out=coreFinishMatch(...args);if(wasGuild){renderHighlights();document.body.classList.remove("final-assault","final-thirty","sudden-death");if($("battleExcitement"))$("battleExcitement").hidden=true;}return out;};

addEventListener("pagehide",()=>{document.body.classList.remove("final-assault","final-thirty","sudden-death");});
})();