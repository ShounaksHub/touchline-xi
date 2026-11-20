import {getTeam} from './data.js';
import {readStore, writeStore} from './storage.js';
import {rescues, rescueMatch, draftRoles, draftPrice, budgetMatch, newRun, runMatch, settleRun, takeKick} from './challenges.js';

export function setupChallenges(pool, launch, notify) {
  const el = id => document.getElementById(id);
  const on = (id, event, fn) => el(id).addEventListener(event, fn);
  const option = (label, value) => new Option(label, String(value));
  const day = () => new Date().toISOString().slice(0,10);
  const dailyIndex = () => Math.floor(Date.parse(day()) / 86400000) % rescues.length;
  const dailyKey = () => 'daily-rescue-' + day();
  const brief = i => {
    const s = rescues[i];
    const remaining = 5-s.subs;
    return 'Mohun Bagan '+['0–1','1–0','2–2'][i]+' '+getTeam(s.away).name+' at '+s.minute+'′. '+s.goal+'. '+remaining+(remaining===1?' substitution':' substitutions')+' left.';
  };
  const refreshDaily = () => {
    el('dailyBrief').textContent = day() + ' UTC · ' + brief(dailyIndex());
    const first = readStore(dailyKey(), null);
    el('dailyRecord').textContent = first?.result || (first ? 'First attempt started. Further starts are practice.' : 'Everyone gets the same fixture. Your first attempt counts.');
    el('dailyShare').hidden = !first?.result;
  };
  rescues.forEach((s,i) => el('rescuePick').add(option(s.title,i)));
  const refreshRescue = () => el('rescueBrief').textContent = brief(+el('rescuePick').value);
  refreshRescue();
  on('rescuePick','change',refreshRescue);
  on('rescueStart','click',() => launch(rescueMatch(+el('rescuePick').value)));
  on('dailyStart','click',() => {
    const m = rescueMatch(dailyIndex(),day());
    m.challenge.practice = !!readStore(dailyKey(),null);
    if (!m.challenge.practice) writeStore(dailyKey(),{started:true});
    refreshDaily();
    launch(m);
  });
  on('dailyShare','click',async () => {
    const card = readStore(dailyKey(),null)?.result;
    if (!card) return refreshDaily();
    try { await navigator.clipboard.writeText(card); notify('Scorecard copied.'); }
    catch { window.prompt('Copy your scorecard',card); }
  });

  const eligible = pool.filter(p=>!p.isGenerated);
  const squad = [];
  for (const role of draftRoles) {
    const options = eligible.filter(p=>p.role===role && !squad.includes(p));
    squad.push(options.find(p=>draftPrice(p)<=6) || options.at(-1));
  }
  const total = () => squad.reduce((n,p)=>n+draftPrice(p),0);
  function listPlayers() {
    const slot = +el('budgetSlot').value;
    const query = el('budgetSearch').value.trim().toLowerCase();
    const options = eligible.filter(p => p.role===draftRoles[slot] && (!squad.includes(p) || p===squad[slot]) &&
      (p.name+' '+p.club).toLowerCase().includes(query));
    // Keep a range of prices in the initial shortlist; search covers the entire pool.
    const picks = query ? options.slice(0,120) : options.filter((p,i)=>i<12 || i%Math.max(1,Math.floor(options.length/64))===0);
    if (!query && !picks.includes(squad[slot])) picks.unshift(squad[slot]);
    el('budgetPlayer').replaceChildren(...picks.map(p=>option(p.name+' · '+draftPrice(p)+' credits · '+p.ovr+' OVR',p.id)));
    if (!query) el('budgetPlayer').value = squad[slot].id;
    el('budgetSign').disabled = !picks.length;
  }
  function refreshDraft(slot=0) {
    el('budgetSlot').replaceChildren(...squad.map((p,i)=>option((i<11?'XI':'Sub')+' · '+draftRoles[i]+' · '+p.name+' ('+draftPrice(p)+')',i)));
    el('budgetSlot').value = String(slot);
    el('budgetBalance').textContent = total()+' / 100 credits used';
    el('budgetStart').disabled = total()>100;
    listPlayers();
  }
  for (const id of ['club_mumbai_city','club_brighton','club_real_madrid']) el('budgetOpponent').add(option(getTeam(id).name,id));
  on('budgetSlot','change',()=>{el('budgetSearch').value='';listPlayers();});
  on('budgetSearch','input',listPlayers);
  on('budgetSign','click',()=>{
    const i = +el('budgetSlot').value;
    const next = eligible.find(p=>p.id===el('budgetPlayer').value);
    if (!next || next.role!==draftRoles[i]) return;
    squad[i]=next;
    el('budgetSearch').value='';
    refreshDraft(i);
  });
  on('budgetStart','click',()=>launch(budgetMatch(squad,el('budgetOpponent').value)));
  refreshDraft();

  const clubs = ['club_real_madrid','club_man_city'].map(getTeam);
  const selectors = clubs.map(team=>{
    const field=document.createElement('fieldset');
    const legend=document.createElement('legend');
    legend.textContent=team.name+' · kicking order';
    field.append(legend);
    const players=team.players.filter(p=>p.role!=='GK' && !p.isGenerated).sort((a,b)=>b.shooting-a.shooting);
    const inputs=Array.from({length:5},(_,i)=>{
      const input=document.createElement('select');
      input.setAttribute('aria-label',team.short+' kicker '+(i+1));
      input.replaceChildren(...players.map(p=>option(p.name,p.id)));
      input.selectedIndex=i;
      field.append(input);
      return input;
    });
    el('penaltyOrders').append(field);
    return inputs;
  });
  let game=null, hiddenShot=null;
  const directions=['Left','Centre','Right'];
  const randomSide=()=>directions[Math.floor(Math.random()*3)];
  function penaltyPrompt(last='') {
    const side=game.kicks.length%2;
    const score=clubs[0].short+' '+game.score.join('–')+' '+clubs[1].short+'. ';
    if (game.winner) {
      el('penaltyStatus').textContent=last+score+clubs[game.winner-1].name+' win.';
      el('penaltyChoices').hidden=true;
      return;
    }
    const kicker=game.order[side][Math.floor(game.kicks.length/2)%5];
    const keeping=game.local ? hiddenShot!==null : side===1;
    el('penaltyStatus').textContent=last+score+(game.kicks.length>=10?'Sudden death. ':'')+
      (keeping ? clubs[1-side].short+' keeper: choose your dive against '+kicker.name : kicker.name+' ('+clubs[side].short+'): aim your kick')+'.';
  }
  for (const direction of directions) {
    const btn=document.createElement('button');
    btn.className='secondary-button';
    btn.textContent=direction;
    btn.onclick=()=>{
      if (!game || game.winner) return;
      if (game.local && hiddenShot===null) {
        hiddenShot=direction;
        btn.blur();
        penaltyPrompt('Pass the device to the keeper. ');
        return;
      }
      const side=game.kicks.length%2;
      const p=game.order[side][Math.floor(game.kicks.length/2)%5];
      const shot=game.local ? hiddenShot : side===0 ? direction : randomSide();
      const dive=game.local || side===1 ? direction : randomSide();
      takeKick(game,shot,dive,p.shooting);
      hiddenShot=null;
      penaltyPrompt(p.name+' · '+game.kicks.at(-1)+'. ');
    };
    el('penaltyChoices').append(btn);
  }
  on('penaltyStart','click',()=>{
    const order=selectors.map((inputs,s)=>inputs.map(input=>clubs[s].players.find(p=>p.id===input.value)));
    if (order.some(row=>new Set(row).size!==5)) return notify('Pick five different takers for each team.');
    game={order,local:el('penaltyMode').value==='local', kicks:[],score:[0,0],winner:0};
    hiddenShot=null;
    el('penaltyChoices').hidden=false;
    el('penaltyStart').textContent='Restart shootout';
    penaltyPrompt();
  });

  let run=readStore('survival-run',null);
  function refreshRun() {
    if (!run) return;
    const safe=run.points>run.rivalPoints || run.points===run.rivalPoints && run.gd>run.rivalGd;
    el('runTable').textContent='Brighton '+run.points+' pts (GD '+run.gd+') · Everton '+run.rivalPoints+' pts (GD '+run.rivalGd+'). '+
      (run.week===5 ? safe?'Brighton stay up.':'Brighton go down.' : 'Match '+(run.week+1)+' of 5.');
    el('runHistory').textContent=run.results.join(' · ')+(run.banned.length?' · Suspended: '+run.banned.map(id=>getTeam('club_brighton').players.find(p=>p.id===id)?.name).join(', '):'');
    el('runStart').textContent=run.week===5?'Start another run':'Play next fixture';
  }
  on('runStart','click',()=>{
    if (!run || run.week===5) run=newRun('RUN-'+Date.now());
    writeStore('survival-run',run);
    refreshRun();
    launch(runMatch(run));
  });
  refreshRun();
  refreshDaily();
  return {
    refreshDaily,
    finish(m, result) {
      const c=m.challenge;
      if (!c || c.practice) return;
      if (c.day) {
        const key='daily-rescue-'+c.day;
        if (!readStore(key,null)?.result) writeStore(key,{result:'Touchline XI · '+c.day+' · '+rescues[c.index].title+' · '+result+' · '+m.score.home+'–'+m.score.away+' · '+(m.substitutionsUsed-rescues[c.index].subs)+' subs used'});
        refreshDaily();
      }
      if (c.kind==='survival' && run) {
        run=settleRun(run,m);
        writeStore('survival-run',run);
        refreshRun();
      }
    }
  };
}
