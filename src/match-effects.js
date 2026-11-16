/**
 * Touchline XI — Cinematic Match Events & Broadcast Graphics Controller
 *
 * Reusable, responsive football broadcast graphics system.
 * Zero external dependencies. Fully deterministic replay-safe.
 *
 * Features:
 * - Broadcast Mode (cinematic hold & dramatic pause) vs Continuous Mode (non-blocking overlay)
 * - Goal animations with context detection (Opener, Equalizer, Hat-Trick, Late Winner, Penalty, Extra Time)
 * - Yellow cards & Second-Yellow to Red transition sequences
 * - Red cards with 10-men tactical impact badge
 * - Penalty awarded, scored, saved, woodwork, and shootout deciders
 * - Opposing directional substitution graphics (▲ ON / ▼ OFF)
 * - Half-time & Full-time broadcast summary cards with stats
 * - Tournament victory trophy celebration
 * - Accessibility: prefers-reduced-motion, aria-live announcements, keyboard dismiss
 * - Replay scrubbing safety: deduplication, queue cleanup, no state mutation
 */

import { getTeam, getPlayer } from './data.js';
import { getTeamBadgeSvg } from './badges.js';
import { sound } from './sound.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export class MatchEffectsController {
  constructor(options = {}) {
    this.container = options.container || null;
    this.onPause = options.onPause || null;
    this.onResume = options.onResume || null;
    this.mode = 'broadcast'; // 'broadcast' | 'continuous'
    this.speed = 1;
    this.reducedMotion = false;
    this.queue = [];
    this.activeEffect = null;
    this.dismissTimer = null;
    this.seenKeys = new Set();
    this.soundEnabled = true;

    try {
      const savedMode = localStorage.getItem('touchline_presentation_mode');
      if (savedMode === 'continuous' || savedMode === 'broadcast') {
        this.mode = savedMode;
      }
      if (typeof window !== 'undefined' && window.matchMedia) {
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    } catch {}
  }

  setContainer(el) {
    this.container = el;
  }

  setMode(mode) {
    if (mode === 'broadcast' || mode === 'continuous') {
      this.mode = mode;
      try {
        localStorage.setItem('touchline_presentation_mode', mode);
      } catch {}
    }
  }

  toggleMode() {
    this.setMode(this.mode === 'broadcast' ? 'continuous' : 'broadcast');
    return this.mode;
  }

  setSpeed(speed) {
    this.speed = Number(speed) || 1;
  }

  clear() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.queue = [];
    this.activeEffect = null;
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.remove('has-active-graphic');
    }
  }

  resetSeen() {
    this.seenKeys.clear();
  }

  /**
   * Main entrypoint to inspect new engine events and schedule broadcast graphics
   */
  processEvents(match, nextEvents = [], options = {}) {
    if (!nextEvents || !nextEvents.length) return;
    const isReplay = Boolean(options.replay);
    const speed = options.speed || this.speed;
    this.setSpeed(speed);

    for (let idx = 0; idx < nextEvents.length; idx++) {
      const ev = nextEvents[idx];
      const key = `${match.seed}_${ev.minute}_${ev.type}_${ev.side || 'n'}_${ev.playerId || ''}_${ev.card || ''}_${idx}`;
      if (this.seenKeys.has(key)) continue;
      this.seenKeys.add(key);

      const parsed = this.parseEngineEvent(match, ev, isReplay);
      if (parsed) {
        this.enqueue(parsed);
      }
    }

    if (!this.activeEffect) {
      this.playNext();
    }
  }

  parseEngineEvent(match, ev, isReplay) {
    const minute = ev.minute ?? match.minute ?? 0;
    const side = ev.side;
    const team = side ? getTeam(side === 'home' ? match.homeId : match.awayId) : null;
    const oppSide = side === 'home' ? 'away' : 'home';
    const oppTeam = side ? getTeam(side === 'home' ? match.awayId : match.homeId) : null;

    // 1. GOAL EVENT
    if (ev.type === 'goal') {
      const isPenalty = Boolean(ev.isPenalty || ev.text?.includes('PENALTY'));
      const isOwnGoal = Boolean(ev.isOwnGoal || ev.text?.includes('OWN GOAL'));
      const scorerId = ev.playerId;
      const scorer = (scorerId ? getPlayer(match, scorerId) : null) || { name: ev.detail?.scorer || this.extractName(ev.text) || 'Striker', role: 'FWD', number: 9 };
      const assister = ev.assistName ? { name: ev.assistName } : (ev.assistId ? getPlayer(match, ev.assistId) : null);
      const isExtraTime = minute > 90 && Boolean(match.knockout);

      // Count goals by this player in this match
      const playerGoals = match.events.filter(e => e.type === 'goal' && (e.playerId === scorerId || e.text?.includes(scorer.name))).length;
      const isHatTrick = playerGoals === 3;
      const isBrace = playerGoals === 2;

      const score = match.score || { home: 0, away: 0 };
      const totalGoals = score.home + score.away;
      const isOpening = totalGoals === 1;
      const isEqualizer = score.home === score.away && totalGoals > 0;
      const isLateWinner = minute >= 80 && (score[side] > score[oppSide]) && (score[side] - score[oppSide] === 1);

      let contextBadge = 'GOAL';
      let contextClass = 'tag-normal';
      if (isOwnGoal) {
        contextBadge = 'OWN GOAL';
        contextClass = 'tag-owngoal';
      } else if (isHatTrick) {
        contextBadge = '🔥 HAT-TRICK!';
        contextClass = 'tag-hattrick';
      } else if (isLateWinner) {
        contextBadge = '⏱️ LATE DRAMA!';
        contextClass = 'tag-late';
      } else if (isEqualizer) {
        contextBadge = '⚡ EQUALIZER!';
        contextClass = 'tag-equalizer';
      } else if (isOpening) {
        contextBadge = '⚽ OPENING GOAL';
        contextClass = 'tag-opener';
      } else if (isPenalty) {
        contextBadge = '🎯 PENALTY GOAL';
        contextClass = 'tag-penalty';
      } else if (isExtraTime) {
        contextBadge = '🏆 EXTRA TIME GOAL';
        contextClass = 'tag-extratime';
      }

      return {
        type: 'GOAL',
        priority: 100,
        match,
        minute,
        side,
        team,
        oppTeam,
        scorer,
        assister,
        score: { ...score },
        contextBadge,
        contextClass,
        isPenalty,
        isOwnGoal,
        xg: ev.xg,
        text: ev.text
      };
    }

    // 2. DISCIPLINARY CARD EVENT
    if (ev.type === 'card') {
      const offender = (ev.playerId ? getPlayer(match, ev.playerId) : null) || { name: this.extractName(ev.text) || 'Defender', role: 'DEF', number: 4 };
      if (ev.card === 'second_yellow') {
        return {
          type: 'SECOND_YELLOW',
          priority: 92,
          match,
          minute,
          side,
          team,
          player: offender,
          reason: 'Second bookable offence — sent off',
          text: ev.text
        };
      }
      if (ev.card === 'red') {
        return {
          type: 'RED_CARD',
          priority: 90,
          match,
          minute,
          side,
          team,
          player: offender,
          reason: 'Serious foul play — straight dismissal',
          text: ev.text
        };
      }
      if (ev.card === 'yellow') {
        return {
          type: 'YELLOW_CARD',
          priority: 60,
          match,
          minute,
          side,
          team,
          player: offender,
          reason: 'Tactical foul',
          text: ev.text
        };
      }
    }

    // 3. IN-REGULATION PENALTY SAVED
    if (ev.type === 'save' && ev.isPenalty) {
      const gk = match.playerStates[oppSide]?.[0] || { name: 'Goalkeeper', role: 'GK', number: 1 };
      const taker = (ev.playerId ? getPlayer(match, ev.playerId) : null) || { name: 'Penalty Taker' };
      return {
        type: 'PENALTY_SAVED',
        priority: 75,
        match,
        minute,
        side,
        team,
        gk,
        taker,
        text: ev.text
      };
    }

    // 4. WOODWORK / POST SHOT
    if (ev.type === 'shot' && ev.text?.includes('POST')) {
      const shooter = (ev.playerId ? getPlayer(match, ev.playerId) : null) || { name: 'Attacker' };
      return {
        type: 'WOODWORK',
        priority: 36,
        match,
        minute,
        side,
        team,
        shooter,
        text: ev.text
      };
    }

    // 5. GREAT GOALKEEPER SAVE
    if (ev.type === 'save' && (ev.xg >= 0.22 || ev.text?.includes('WHAT A SAVE'))) {
      const gk = match.playerStates[oppSide]?.[0] || { name: 'Goalkeeper' };
      const shooter = (ev.playerId ? getPlayer(match, ev.playerId) : null) || { name: 'Attacker' };
      return {
        type: 'MAJOR_SAVE',
        priority: 35,
        match,
        minute,
        side,
        team,
        gk,
        shooter,
        text: ev.text
      };
    }

    // 6. SUBSTITUTION
    if (ev.type === 'sub') {
      const incoming = ev.incomingName || this.extractSubIn(ev.text) || 'Substitute';
      const outgoing = ev.outgoingName || this.extractSubOut(ev.text) || 'Starter';
      return {
        type: 'SUBSTITUTION',
        priority: 50,
        match,
        minute,
        side,
        team: getTeam(match.homeId), // User managed
        incoming: { name: incoming, role: ev.incomingRole || 'SUB', number: ev.incomingNumber || 17 },
        outgoing: { name: outgoing, role: ev.outgoingRole || 'XI', number: ev.outgoingNumber || 7 },
        text: ev.text
      };
    }

    // 7. OFFSIDE
    if (ev.type === 'offside') {
      const runner = (ev.playerId ? getPlayer(match, ev.playerId) : null) || { name: this.extractName(ev.text) || 'Attacker' };
      return {
        type: 'OFFSIDE',
        priority: 40,
        match,
        minute,
        side,
        team,
        player: runner,
        text: ev.text
      };
    }

    // 8. 4TH OFFICIAL INJURY TIME
    if (ev.type === 'tactic' && ev.text?.includes('4th Official')) {
      const matchMin = ev.text.match(/\+(\d+)\s*min/);
      const added = matchMin ? matchMin[1] : '3';
      return {
        type: 'INJURY_TIME',
        priority: 25,
        match,
        minute,
        addedMinutes: added,
        text: ev.text
      };
    }

    // 9. HALF TIME
    if (ev.type === 'half' && match.phase === 'HALF_TIME') {
      return {
        type: 'HALF_TIME',
        priority: 70,
        match,
        minute: 45,
        homeTeam: getTeam(match.homeId),
        awayTeam: getTeam(match.awayId),
        score: { ...match.score },
        stats: { ...match.stats }
      };
    }

    // 10. FULL TIME
    if (ev.type === 'full' && match.phase === 'FULL_TIME') {
      const isShootout = Boolean(match.shootout);
      const winnerSide = match.winner;
      const winnerTeam = winnerSide ? getTeam(winnerSide === 'home' ? match.homeId : match.awayId) : null;
      return {
        type: 'FULL_TIME',
        priority: 85,
        match,
        minute: match.minute,
        homeTeam: getTeam(match.homeId),
        awayTeam: getTeam(match.awayId),
        score: { ...match.score },
        stats: { ...match.stats },
        isShootout,
        shootout: match.shootout,
        winnerTeam,
        text: ev.text
      };
    }

    // 11. SHOOTOUT DECISIVE PENALTY
    if (ev.type === 'shootout' && ev.round >= 5) {
      return {
        type: 'SHOOTOUT_KICK',
        priority: 65,
        match,
        minute: 120,
        side,
        team,
        round: ev.round,
        scored: ev.scored,
        text: ev.text
      };
    }

    return null;
  }

  extractName(text) {
    if (!text) return null;
    const m = text.match(/(?:by|denies|with|caught offside\s*on\s*the\s*through-ball\.?|foul\s*by|Booking:\s*|GOAL!\s*)([A-Z][a-zA-ZÀ-ÿ\s.'-]+?)(?:\s+(?:finds|is|coolly|dives|receives|goes|concedes|threads|links|replaces|sends)|\!|\—|\(|$)/i);
    return m ? m[1].trim() : null;
  }

  extractSubIn(text) {
    const m = text.match(/^([A-Z][a-zA-ZÀ-ÿ\s.'-]+?)\s+replaces/i);
    return m ? m[1].trim() : null;
  }

  extractSubOut(text) {
    const m = text.match(/replaces\s+([A-Z][a-zA-ZÀ-ÿ\s.'-]+?)\.?$/i);
    return m ? m[1].trim() : null;
  }

  enqueue(effect) {
    // If higher priority than active effect and we are in continuous mode or want to supersede, replace
    if (this.activeEffect && effect.priority > this.activeEffect.priority + 25) {
      this.clearCurrent();
      this.activeEffect = effect;
      this.renderEffect(effect);
      return;
    }
    this.queue.push(effect);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  playNext() {
    if (!this.queue.length) {
      this.activeEffect = null;
      if (this.container) {
        this.container.innerHTML = '';
        this.container.classList.remove('has-active-graphic');
      }
      return;
    }

    const effect = this.queue.shift();
    this.activeEffect = effect;
    this.renderEffect(effect);
  }

  clearCurrent() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.remove('has-active-graphic');
    }
    this.activeEffect = null;
  }

  dismiss(autoResume = true) {
    this.clearCurrent();
    if (autoResume && this.mode === 'broadcast' && this.onResume) {
      this.onResume();
    }
    // Play next queued effect if any
    if (this.queue.length) {
      setTimeout(() => this.playNext(), 120);
    }
  }

  renderEffect(effect) {
    if (!this.container) return;

    // In Broadcast Mode, hold match simulation for dramatic effect
    const shouldHold = this.mode === 'broadcast' && (
      effect.type === 'GOAL' ||
      effect.type === 'RED_CARD' ||
      effect.type === 'SECOND_YELLOW' ||
      effect.type === 'HALF_TIME' ||
      effect.type === 'FULL_TIME' ||
      effect.type === 'PENALTY_SAVED'
    );

    if (shouldHold && this.onPause) {
      this.onPause();
    }

    // Play appropriate procedural Web Audio sound
    this.triggerAudio(effect);

    // Build markup
    let html = '';
    let durationMs = 3200;

    switch (effect.type) {
      case 'GOAL':
        html = this.buildGoalMarkup(effect);
        durationMs = 3400;
        break;
      case 'YELLOW_CARD':
        html = this.buildCardMarkup(effect, 'yellow');
        durationMs = 2100;
        break;
      case 'RED_CARD':
        html = this.buildCardMarkup(effect, 'red');
        durationMs = 3000;
        break;
      case 'SECOND_YELLOW':
        html = this.buildSecondYellowMarkup(effect);
        durationMs = 3400;
        break;
      case 'PENALTY_SAVED':
        html = this.buildPenaltySavedMarkup(effect);
        durationMs = 2600;
        break;
      case 'WOODWORK':
        html = this.buildWoodworkMarkup(effect);
        durationMs = 2000;
        break;
      case 'MAJOR_SAVE':
        html = this.buildMajorSaveMarkup(effect);
        durationMs = 2000;
        break;
      case 'SUBSTITUTION':
        html = this.buildSubMarkup(effect);
        durationMs = 2600;
        break;
      case 'OFFSIDE':
        html = this.buildOffsideMarkup(effect);
        durationMs = 1800;
        break;
      case 'INJURY_TIME':
        html = this.buildStoppageMarkup(effect);
        durationMs = 2200;
        break;
      case 'HALF_TIME':
        html = this.buildHalfTimeMarkup(effect);
        durationMs = shouldHold ? 0 : 4000; // In broadcast mode, user resumes or clicks
        break;
      case 'FULL_TIME':
        html = this.buildFullTimeMarkup(effect);
        durationMs = shouldHold ? 0 : 5000;
        break;
      default:
        return;
    }

    // Scale duration by playback speed (higher speed = faster dismiss)
    if (this.speed > 1 && durationMs > 0) {
      durationMs = Math.max(600, Math.round(durationMs / (this.speed * 0.85)));
    }

    this.container.innerHTML = html;
    this.container.classList.add('has-active-graphic');

    // Bind interactive resume / dismiss buttons
    const resumeBtn = this.container.querySelector('.broadcast-resume-action');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(true);
      });
    }

    const closeBtn = this.container.querySelector('.broadcast-card-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(false);
      });
    }

    // Set auto-dismiss timer unless duration is 0 (permanent hold until click)
    if (durationMs > 0) {
      this.dismissTimer = setTimeout(() => {
        this.dismiss(shouldHold);
      }, durationMs);
    }
  }

  triggerAudio(effect) {
    if (!this.soundEnabled) return;
    try {
      switch (effect.type) {
        case 'GOAL':
          sound.playGoalCheer();
          break;
        case 'YELLOW_CARD':
          sound.playShortWhistle();
          break;
        case 'RED_CARD':
          sound.playCardWhistle();
          setTimeout(() => sound.playCrowdGasp(), 300);
          break;
        case 'SECOND_YELLOW':
          sound.playShortWhistle();
          setTimeout(() => {
            sound.playCardWhistle();
            sound.playCrowdGasp();
          }, 1100);
          break;
        case 'PENALTY_SAVED':
          sound.playCrowdGasp();
          break;
        case 'MAJOR_SAVE':
          sound.playSaveCheer();
          break;
        case 'SUBSTITUTION':
          sound.playSubCue();
          break;
        case 'OFFSIDE':
          sound.playShortWhistle();
          break;
        case 'HALF_TIME':
          sound.playHalfTimeWhistle();
          break;
        case 'FULL_TIME':
          sound.playFullTimeWhistle();
          if (effect.winnerTeam) {
            setTimeout(() => sound.playTrophyFanfare(), 800);
          }
          break;
      }
    } catch {}
  }

  // =========================================================================
  // MARKUP BUILDERS
  // =========================================================================

  buildGoalMarkup(effect) {
    const { team, scorer, assister, score, contextBadge, contextClass, minute, isOwnGoal } = effect;
    const badgeSvg = team ? getTeamBadgeSvg(team, 44, 48) : '';
    const homeTeam = getTeam(effect.match.homeId);
    const awayTeam = getTeam(effect.match.awayId);

    const assistLine = assister && assister.name && !isOwnGoal
      ? `<div class="broadcast-assist-line">
           <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
           <span>Assist: <b>${escapeHtml(assister.name)}</b></span>
         </div>`
      : '';

    const actionBtn = this.mode === 'broadcast'
      ? `<button type="button" class="broadcast-resume-action" aria-label="Resume match">Resume Match ␣</button>`
      : '';

    return `
      <div class="broadcast-goal-presentation ${contextClass}" role="dialog" aria-label="Goal celebration graphic">
        <div class="goal-stadium-flash"></div>
        <div class="broadcast-goal-card">
          <div class="goal-top-ribbon">
            <span class="broadcast-pill-live">TXI · BROADCAST</span>
            <span class="broadcast-pill-tag ${contextClass}">${escapeHtml(contextBadge)}</span>
            <span class="broadcast-minute-badge">${minute}′</span>
          </div>

          <div class="goal-main-row">
            <div class="goal-team-crest">${badgeSvg}</div>
            <div class="goal-scorer-info">
              <span class="goal-club-title">${escapeHtml(team?.name?.toUpperCase() || '')}</span>
              <h2 class="goal-scorer-name">${escapeHtml(scorer.name || 'Striker')}</h2>
              ${assistLine}
            </div>
            <div class="goal-score-panel">
              <div class="goal-score-teams">
                <span>${escapeHtml(homeTeam.short)}</span>
                <span class="goal-score-numbers">${score.home} — ${score.away}</span>
                <span>${escapeHtml(awayTeam.short)}</span>
              </div>
            </div>
          </div>

          <div class="broadcast-card-footer">
            <span class="broadcast-context-note">${escapeHtml(effect.text || '')}</span>
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  }

  buildCardMarkup(effect, cardColor) {
    const { team, player, reason, minute } = effect;
    const badgeSvg = team ? getTeamBadgeSvg(team, 32, 36) : '';
    const isRed = cardColor === 'red';
    const cardClass = isRed ? 'card-red' : 'card-yellow';
    const title = isRed ? 'DIRECT RED CARD' : 'YELLOW CARD (BOOKING)';
    const impactBadge = isRed ? '<span class="broadcast-tactical-impact">⚠️ REDUCED TO 10 PLAYERS</span>' : '';

    return `
      <div class="broadcast-card-presentation ${cardClass}" role="status" aria-label="${title}">
        <div class="broadcast-event-banner">
          <div class="referee-card-visual ${cardClass}"></div>
          <div class="broadcast-event-body">
            <div class="broadcast-banner-header">
              <span class="broadcast-pill-tag tag-${cardColor}">${title}</span>
              <span class="broadcast-minute-badge">${minute}′</span>
              ${impactBadge}
            </div>
            <div class="broadcast-player-row">
              <div class="broadcast-mini-crest">${badgeSvg}</div>
              <div class="broadcast-player-details">
                <h3 class="broadcast-player-name">${escapeHtml(player.name)} <span class="broadcast-role-tag">${escapeHtml(player.role || 'DEF')}</span></h3>
                <span class="broadcast-sub-text">${escapeHtml(team?.name || '')} · ${escapeHtml(reason)}</span>
              </div>
            </div>
          </div>
          <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
  }

  buildSecondYellowMarkup(effect) {
    const { team, player, reason, minute } = effect;
    const badgeSvg = team ? getTeamBadgeSvg(team, 32, 36) : '';

    return `
      <div class="broadcast-card-presentation card-second-yellow" role="status" aria-label="Second Yellow Dismissal">
        <div class="broadcast-event-banner banner-dismissal">
          <div class="referee-cards-flipper">
            <div class="referee-card-visual card-yellow flip-first"></div>
            <div class="referee-card-visual card-red flip-second"></div>
          </div>
          <div class="broadcast-event-body">
            <div class="broadcast-banner-header">
              <span class="broadcast-pill-tag tag-second-yellow">SECOND YELLOW CARD</span>
              <span class="broadcast-pill-tag tag-red">SENT OFF</span>
              <span class="broadcast-minute-badge">${minute}′</span>
              <span class="broadcast-tactical-impact">⚠️ REDUCED TO 10 PLAYERS</span>
            </div>
            <div class="broadcast-player-row">
              <div class="broadcast-mini-crest">${badgeSvg}</div>
              <div class="broadcast-player-details">
                <h3 class="broadcast-player-name">${escapeHtml(player.name)} <span class="broadcast-role-tag">${escapeHtml(player.role || 'DEF')}</span></h3>
                <span class="broadcast-sub-text">${escapeHtml(team?.name || '')} · ${escapeHtml(reason)}</span>
              </div>
            </div>
          </div>
          <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
  }

  buildPenaltySavedMarkup(effect) {
    const { team, gk, taker, minute } = effect;
    const badgeSvg = team ? getTeamBadgeSvg(team, 32, 36) : '';

    return `
      <div class="broadcast-card-presentation card-penalty-save" role="status" aria-label="Penalty saved">
        <div class="broadcast-event-banner">
          <div class="penalty-save-icon">🧤</div>
          <div class="broadcast-event-body">
            <div class="broadcast-banner-header">
              <span class="broadcast-pill-tag tag-save">PENALTY SAVED!</span>
              <span class="broadcast-minute-badge">${minute}′</span>
            </div>
            <div class="broadcast-player-row">
              <div class="broadcast-mini-crest">${badgeSvg}</div>
              <div class="broadcast-player-details">
                <h3 class="broadcast-player-name">${escapeHtml(gk.name)} denies ${escapeHtml(taker.name)} from the spot!</h3>
                <span class="broadcast-sub-text">Incredible reflex save preserves the scoreline</span>
              </div>
            </div>
          </div>
          <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
  }

  buildWoodworkMarkup(effect) {
    const { shooter, minute } = effect;
    return `
      <div class="broadcast-card-presentation card-woodwork" role="status" aria-label="Woodwork struck">
        <div class="broadcast-event-banner">
          <div class="penalty-save-icon">⚡</div>
          <div class="broadcast-event-body">
            <div class="broadcast-banner-header">
              <span class="broadcast-pill-tag tag-woodwork">OFF THE WOODWORK!</span>
              <span class="broadcast-minute-badge">${minute}′</span>
            </div>
            <span class="broadcast-sub-text">${escapeHtml(shooter.name)}'s strike rattles the woodwork!</span>
          </div>
          <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
  }

  buildMajorSaveMarkup(effect) {
    const { gk, shooter, minute } = effect;
    return `
      <div class="broadcast-card-presentation card-save" role="status" aria-label="Great Save">
        <div class="broadcast-event-banner">
          <div class="penalty-save-icon">🧤</div>
          <div class="broadcast-event-body">
            <div class="broadcast-banner-header">
              <span class="broadcast-pill-tag tag-save">GREAT SAVE!</span>
              <span class="broadcast-minute-badge">${minute}′</span>
            </div>
            <span class="broadcast-sub-text"><b>${escapeHtml(gk.name)}</b> denies <b>${escapeHtml(shooter.name)}</b> with a heroic reaction stop!</span>
          </div>
          <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
  }

  buildSubMarkup(effect) {
    const { team, incoming, outgoing, minute } = effect;
    const badgeSvg = team ? getTeamBadgeSvg(team, 32, 36) : '';

    return `
      <div class="broadcast-sub-presentation" role="status" aria-label="Substitution">
        <div class="broadcast-sub-card">
          <div class="sub-header-row">
            <span class="sub-icon">🔄</span>
            <span class="broadcast-pill-tag tag-sub">SUBSTITUTION</span>
            <span class="sub-team-name">${escapeHtml(team?.name || '')}</span>
            <span class="broadcast-minute-badge">${minute}′</span>
          </div>
          <div class="sub-players-container">
            <div class="sub-player-item sub-player-on">
              <span class="sub-arrow-badge arrow-on">▲ ON</span>
              <div class="sub-name-wrap">
                <span class="sub-pname">${escapeHtml(incoming.name)}</span>
                <span class="sub-meta">${escapeHtml(incoming.role)} · #${incoming.number || ''}</span>
              </div>
            </div>
            <div class="sub-player-item sub-player-off">
              <span class="sub-arrow-badge arrow-off">▼ OFF</span>
              <div class="sub-name-wrap">
                <span class="sub-pname">${escapeHtml(outgoing.name)}</span>
                <span class="sub-meta">${escapeHtml(outgoing.role)} · #${outgoing.number || ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  buildOffsideMarkup(effect) {
    const { player, minute } = effect;
    return `
      <div class="broadcast-strip-presentation strip-offside" role="status" aria-label="Offside">
        <span class="strip-icon">🚩</span>
        <span class="broadcast-pill-tag tag-offside">OFFSIDE</span>
        <span class="strip-text">Flag raised on <b>${escapeHtml(player.name)}</b> · ${minute}′</span>
      </div>
    `;
  }

  buildStoppageMarkup(effect) {
    const { addedMinutes, minute } = effect;
    return `
      <div class="broadcast-stoppage-board" role="status" aria-label="Added injury time">
        <div class="stoppage-led-wrap">
          <span class="stoppage-label">ADDED TIME</span>
          <span class="stoppage-led-digits">+${escapeHtml(addedMinutes)} MIN</span>
        </div>
      </div>
    `;
  }

  buildHalfTimeMarkup(effect) {
    const { homeTeam, awayTeam, score, stats } = effect;
    const homeBadge = getTeamBadgeSvg(homeTeam, 44, 48);
    const awayBadge = getTeamBadgeSvg(awayTeam, 44, 48);
    const hPoss = stats.home?.passes ? Math.round((stats.home.possession / 5400) * 100) : 50;
    const aPoss = 100 - hPoss;

    const actionBtn = this.mode === 'broadcast'
      ? `<button type="button" class="broadcast-resume-action" aria-label="Kick off second half">Kick Off 2nd Half ␣</button>`
      : '';

    return `
      <div class="broadcast-report-presentation" role="dialog" aria-label="Half-time match report">
        <div class="broadcast-report-card">
          <div class="report-header">
            <span class="broadcast-pill-live">TXI · BROADCAST</span>
            <h2>HALF-TIME REPORT (45′)</h2>
            <button type="button" class="broadcast-card-close" aria-label="Close">✕</button>
          </div>

          <div class="report-scoreboard">
            <div class="report-team-side">
              ${homeBadge}
              <span class="report-tname">${escapeHtml(homeTeam.name)}</span>
            </div>
            <div class="report-score-box">
              <span class="report-score-num">${score.home} — ${score.away}</span>
              <span class="report-interval-tag">INTERVAL</span>
            </div>
            <div class="report-team-side">
              ${awayBadge}
              <span class="report-tname">${escapeHtml(awayTeam.name)}</span>
            </div>
          </div>

          <div class="report-stats-grid">
            <div class="report-stat-row">
              <span>${hPoss}%</span>
              <span class="stat-lbl">POSSESSION</span>
              <span>${aPoss}%</span>
            </div>
            <div class="report-stat-row">
              <span>${stats.home?.shots || 0}</span>
              <span class="stat-lbl">SHOTS (ON TARGET)</span>
              <span>${stats.away?.shots || 0}</span>
            </div>
            <div class="report-stat-row">
              <span>${(stats.home?.xg || 0).toFixed(2)}</span>
              <span class="stat-lbl">EXPECTED GOALS (xG)</span>
              <span>${(stats.away?.xg || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="report-footer">
            <span class="report-tip">Use Squad Lab for tactical adjustments or give a team talk.</span>
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  }

  buildFullTimeMarkup(effect) {
    const { homeTeam, awayTeam, score, stats, isShootout, shootout, winnerTeam } = effect;
    const homeBadge = getTeamBadgeSvg(homeTeam, 48, 52);
    const awayBadge = getTeamBadgeSvg(awayTeam, 48, 52);

    let winnerBanner = '';
    if (winnerTeam) {
      winnerBanner = `
        <div class="fulltime-winner-banner">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffd700"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>
          <span><b>${escapeHtml(winnerTeam.name.toUpperCase())}</b> ADVANCE TO THE NEXT ROUND!</span>
        </div>
      `;
    }

    const actionBtn = this.mode === 'broadcast'
      ? `<button type="button" class="broadcast-resume-action" aria-label="Review match stats">Review Matchday ␣</button>`
      : '';

    return `
      <div class="broadcast-report-presentation" role="dialog" aria-label="Full-time match result">
        <div class="broadcast-report-card card-fulltime">
          <div class="report-header">
            <span class="broadcast-pill-live">TXI · FINAL WHISTLE</span>
            <h2>FULL-TIME ${isShootout ? '(PENALTIES)' : ''}</h2>
            <button type="button" class="broadcast-card-close" aria-label="Close">✕</button>
          </div>

          ${winnerBanner}

          <div class="report-scoreboard">
            <div class="report-team-side">
              ${homeBadge}
              <span class="report-tname">${escapeHtml(homeTeam.name)}</span>
            </div>
            <div class="report-score-box">
              <span class="report-score-num">${score.home} — ${score.away}</span>
              ${isShootout ? `<span class="report-interval-tag">PENALTIES: ${shootout.home}-${shootout.away}</span>` : '<span class="report-interval-tag">FINAL RESULT</span>'}
            </div>
            <div class="report-team-side">
              ${awayBadge}
              <span class="report-tname">${escapeHtml(awayTeam.name)}</span>
            </div>
          </div>

          <div class="report-stats-grid">
            <div class="report-stat-row">
              <span>${stats.home?.shots || 0} (${stats.home?.onTarget || 0})</span>
              <span class="stat-lbl">SHOTS (ON TARGET)</span>
              <span>${stats.away?.shots || 0} (${stats.away?.onTarget || 0})</span>
            </div>
            <div class="report-stat-row">
              <span>${(stats.home?.xg || 0).toFixed(2)}</span>
              <span class="stat-lbl">EXPECTED GOALS (xG)</span>
              <span>${(stats.away?.xg || 0).toFixed(2)}</span>
            </div>
            <div class="report-stat-row">
              <span>${stats.home?.corners || 0}</span>
              <span class="stat-lbl">CORNERS</span>
              <span>${stats.away?.corners || 0}</span>
            </div>
            <div class="report-stat-row">
              <span>${stats.home?.fouls || 0}</span>
              <span class="stat-lbl">FOULS</span>
              <span>${stats.away?.fouls || 0}</span>
            </div>
          </div>

          <div class="report-footer">
            <span class="report-tip">Match recording securely preserved in Replay Vault.</span>
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  }
}

export function createMatchEffects(options = {}) {
  return new MatchEffectsController(options);
}
