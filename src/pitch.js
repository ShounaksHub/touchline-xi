import {FORMATIONS,getTeam,getPlayer} from './data.js';

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const lerp=(a,b,p)=>a+(b-a)*p;
const settings={ctx:null,lastSize:null};

export function playerPositions(match, side, time=0) {
  // If match has authoritative spatial playerStates from continuous simulation, use them!
  if (match.playerStates && match.playerStates[side] && match.playerStates[side].length > 0) {
    return match.playerStates[side].map((p, i) => {
      const idleX = Math.sin(time / 1200 + i * 4.2 + (match.minute || 0) * 0.6) * 0.5;
      const idleY = Math.cos(time / 1500 + i * 3.4 + (match.minute || 0) * 0.5) * 0.5;
      return {
        x: clamp(p.x + (i === 0 ? 0 : idleX), 2, 98),
        y: clamp(p.y + (i === 0 ? 0 : idleY), 2, 98),
        role: p.role,
        id: p.id
      };
    });
  }

  const positions=FORMATIONS[match.formations[side]] ?? FORMATIONS['4-3-3'];
  const attack=match.possession===side;
  const tactics=match.tactics[side];
  const width=0.73+(tactics.width/100)*0.46;
  const ball=match.ball;
  const direction=side==='home'?1:-1;
  const drift=(ball.x-50)*0.2 + (attack?5:-3)*direction;
  return positions.map(([role,x,y],i)=>{
    let xx=side==='home'?x:100-x;
    let yy=50+(y-50)*width;
    if(i!==0){
      xx=clamp(xx+drift+(Math.sin(time/1170+i*4.2+match.minute*.6)*.8),5,95);
      yy=clamp(yy+(ball.y-50)*.09+Math.cos(time/1510+i*3.4+match.minute*.5)*.85,5,95);
    }
    return {x:xx,y:yy,role,id:match.lineups[side][i]};
  });
}

function roundedRect(ctx,x,y,w,h,r){if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}else{ctx.beginPath();ctx.rect(x,y,w,h);}}
function setText(ctx,fill,font,align='center'){ctx.fillStyle=fill;ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';}

export function renderPitch(canvas,match,t=0) {
  if(!canvas||!match)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  // Render at device pixel ratio when possible; keep world coordinates stable.
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const scale=Math.min(window.devicePixelRatio||1,2);
  const wPx=Math.max(1,Math.round(rect.width*scale)),hPx=Math.max(1,Math.round(rect.height*scale));
  if(canvas.width!==wPx||canvas.height!==hPx){canvas.width=wPx;canvas.height=hPx;}
  const W=rect.width,H=rect.height;
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.clearRect(0,0,W,H);
  const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#122e22');grad.addColorStop(1,'#0d241d');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  // Stadium perimeter and hand-tuned crop.
  ctx.fillStyle='#1b4532';ctx.fillRect(16,17,W-32,H-34);
  const field={x:W*.058,y:H*.078,w:W*.884,h:H*.844};
  const {x,y,w,h}=field;
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.fillStyle='#24543e';ctx.fillRect(x,y,w,h);
  for(let i=0;i<12;i++){ctx.fillStyle=i%2===0?'rgba(144,195,135,.050)':'rgba(0,0,0,.065)';ctx.fillRect(x+i*w/12,y,w/12,h);}
  // A slight broadcast grain texture, seeded by integer pixel grid, no randomness.
  for(let i=0;i<300;i++){
    const px=x+((i*317.71)%w),py=y+((i*137.93)%h);
    ctx.fillStyle=i%3===0?'rgba(189,230,177,.03)':'rgba(0,0,0,.034)';ctx.fillRect(px,py,1.2,1.2);
  }
  ctx.restore();
  const line='rgba(209,239,207,.60)';ctx.strokeStyle=line;ctx.lineWidth=Math.max(1,W/850);
  ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,h*.144,h*.144,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#d5ebd0';ctx.beginPath();ctx.arc(x+w/2,y+h/2,2,0,Math.PI*2);ctx.fill();
  // 18-yard boxes and six-yard boxes, both sides.
  ctx.strokeRect(x,y+h*.205,w*.155,h*.59);ctx.strokeRect(x+w*.845,y+h*.205,w*.155,h*.59);
  ctx.strokeRect(x,y+h*.34,w*.055,h*.32);ctx.strokeRect(x+w*.945,y+h*.34,w*.055,h*.32);
  ctx.fillStyle=line;ctx.beginPath();ctx.arc(x+w*.11,y+h*.5,1.6,0,Math.PI*2);ctx.arc(x+w*.89,y+h*.5,1.6,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w*.11,y+h*.5,h*.145,-Math.PI*.29,Math.PI*.29);ctx.stroke();
  ctx.beginPath();ctx.arc(x+w*.89,y+h*.5,h*.145,Math.PI*.71,Math.PI*1.29);ctx.stroke();
  // Small goal nets.
  for(const right of [false,true]) {
    const gx=right?x+w:x;
    const nx=right?gx+Math.max(7,W*.012):gx-Math.max(7,W*.012);
    ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(Math.min(gx,nx),y+h*.445,Math.abs(gx-nx),h*.11);
    ctx.strokeStyle='rgba(232,248,221,.72)';ctx.lineWidth=1;
    ctx.strokeRect(Math.min(gx,nx),y+h*.445,Math.abs(gx-nx),h*.11);
    for(let i=1;i<4;i++){const yy=y+h*(.445+i*.11/4);ctx.beginPath();ctx.moveTo(gx,yy);ctx.lineTo(nx,yy);ctx.stroke();}
  }
  const toPixel=(pos)=>({x:x+(pos.x/100)*w,y:y+(pos.y/100)*h});
  const homeTeam=getTeam(match.homeId),awayTeam=getTeam(match.awayId);
  const home=playerPositions(match,'home',t),away=playerPositions(match,'away',t);

  // Initialize or update persistent 60 FPS smooth visual interpolation state on the canvas
  if (!canvas._vis) {
    canvas._vis = {
      lastT: t,
      seed: match.seed,
      ball: { x: (match.ball?.x ?? 50) / 100 * w + x, y: (match.ball?.y ?? 50) / 100 * h + y, trail: [] },
      players: new Map()
    };
  }
  const vis = canvas._vis;
  if (vis.seed !== match.seed || (match.minute === 0 && match.phase === 'PRE_MATCH')) {
    vis.seed = match.seed;
    vis.ball.x = (match.ball?.x ?? 50) / 100 * w + x;
    vis.ball.y = (match.ball?.y ?? 50) / 100 * h + y;
    vis.ball.trail = [];
    vis.players.clear();
  }

  const dt = vis.lastT ? Math.min(48, Math.max(1, t - vis.lastT)) : 16;
  vis.lastT = t;

  const spd = Math.max(1, Math.min(5, match.speed || 1));
  const playerBlend = 1 - Math.exp(-dt * 0.009 * spd);
  const ballBlend = 1 - Math.exp(-dt * 0.016 * spd);

  // Smooth ball glide towards target
  const ballTarget = toPixel(match.ball);
  vis.ball.x = lerp(vis.ball.x, ballTarget.x, ballBlend);
  vis.ball.y = lerp(vis.ball.y, ballTarget.y, ballBlend);

  // Motion trail when ball is traveling fast
  const ballDist = Math.hypot(ballTarget.x - vis.ball.x, ballTarget.y - vis.ball.y);
  if (ballDist > 2.5) {
    vis.ball.trail.push({ x: vis.ball.x, y: vis.ball.y });
    if (vis.ball.trail.length > 5) vis.ball.trail.shift();
  } else if (vis.ball.trail.length > 0) {
    vis.ball.trail.shift();
  }

  const teams=[{name:'home',players:home,team:homeTeam},{name:'away',players:away,team:awayTeam}];
  const carrierId = match.ballState?.carrierId;
  const activeSide = match.possession || 'home';

  // Draw subtle passing channels between nearest players, dynamically anchored to the moving ball
  if(match.minute > 0){
    const playing = teams.find(q => q.name === activeSide) || teams[0];
    const nearest = playing.players.slice(1).map(p => ({ p, dist: (p.x - match.ball.x)**2 + (p.y - match.ball.y)**2 })).sort((a,b) => a.dist - b.dist).slice(0, 3);
    ctx.strokeStyle = 'rgba(211,255,173,.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    nearest.slice(1).forEach(({p}) => {
      const pt = toPixel(p);
      ctx.beginPath();
      ctx.moveTo(vis.ball.x, vis.ball.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  for(const {name,players,team} of teams){
    const active = name === activeSide;
    players.forEach((p,i)=>{
      const pl=getPlayer(team,p.id);if(!pl)return;
      const targetPt = toPixel(p);

      // Smooth visual interpolation for each player node
      const pKey = `${name}-${p.id}`;
      let vp = vis.players.get(pKey);
      if (!vp) {
        vp = { x: targetPt.x, y: targetPt.y };
        vis.players.set(pKey, vp);
      } else {
        vp.x = lerp(vp.x, targetPt.x, playerBlend);
        vp.y = lerp(vp.y, targetPt.y, playerBlend);
      }
      const pt = { x: vp.x, y: vp.y };
      const r = clamp(W*.014,8,14.2);

      ctx.save();ctx.shadowColor='rgba(0,0,0,.39)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;
      ctx.fillStyle=team.primary;ctx.strokeStyle=team.secondary;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;

      // Active ball carrier indicator
      const isCarrier = (active && (carrierId ? p.id === carrierId : (i === 9 || i === 1)));
      if(isCarrier && match.minute > 0){
        const pulse = 1.0 + Math.sin(t / 200) * 0.18;
        ctx.strokeStyle='rgba(237,255,188,.95)';
        ctx.lineWidth=2.0;
        ctx.beginPath();
        ctx.arc(pt.x,pt.y,r + 4.5 * pulse,0,Math.PI*2);
        ctx.stroke();
      }
      setText(ctx,team.secondary,`800 ${Math.max(8,Math.round(r*.96))}px Arial`);ctx.fillText(String(pl.number),pt.x,pt.y+.5);
      
      // Mini stamina bar below player marker
      if (match.stamina && match.stamina[p.id] !== undefined) {
        const stam = match.stamina[p.id];
        const barW = r * 1.5;
        const barH = 2.2;
        const barX = pt.x - barW / 2;
        const barY = pt.y + r + 2.5;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = stam > 65 ? '#55efc4' : stam > 40 ? '#fdcb6e' : '#ff7675';
        ctx.fillRect(barX, barY, Math.max(1, barW * (stam / 100)), barH);
      }

      // Yellow/Red Card Discipline Badge
      const cardCount = match.bookings?.[name]?.[p.id] || 0;
      if (cardCount > 0) {
        const cardW = 5, cardH = 7.5;
        const cardX = pt.x + r - 3;
        const cardY = pt.y - r - 2;
        ctx.fillStyle = cardCount >= 2 ? '#ff3838' : '#ffd32a';
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 1;
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeRect(cardX, cardY, cardW, cardH);
      }

      if(W>620 && (i===9||i===0||i===8||i===10)){
        const parts=(pl.name||'').trim().split(/\s+/);
        const label=(parts[parts.length-1]||pl.role||'').toUpperCase();
        setText(ctx,'rgba(236,249,222,.77)',`700 ${Math.max(7,W*.008)}px Arial`);
        ctx.fillText(label,pt.x,pt.y+r+11);
      }
      ctx.restore();
    });
  }

  // Draw ball motion trail
  if (vis.ball.trail.length > 1) {
    for (let ti = 0; ti < vis.ball.trail.length - 1; ti++) {
      const alpha = ((ti + 1) / (vis.ball.trail.length + 1)) * 0.40;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = Math.max(1.5, W * 0.0035);
      ctx.beginPath();
      ctx.moveTo(vis.ball.trail[ti].x, vis.ball.trail[ti].y);
      ctx.lineTo(vis.ball.trail[ti + 1].x, vis.ball.trail[ti + 1].y);
      ctx.stroke();
    }
  }

  // Draw smooth glowing white ball
  const b = { x: vis.ball.x, y: vis.ball.y };
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,.9)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(b.x, b.y, Math.max(3.5, W * 0.0054), 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#15261e';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  // Edge scales.
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(236,255,224,.37)';ctx.font=`700 ${Math.max(8,W*.010)}px Arial`;
  ctx.fillText('HOME  →',x+w*.16,y-13);ctx.fillText('←  AWAY',x+w*.84,y-13);
}
