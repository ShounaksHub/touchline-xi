/**
 * Touchline XI - Interactive Tutorial & Onboarding Engine
 * Premium step-by-step interactive onboarding, contextual tooltips, and mode replays.
 * Deterministic, offline-first, zero external runtime dependencies.
 */

const STORAGE_KEY = 'touchline_xi_onboarding_v1';

export const TUTORIAL_MODES = {
  MATCHDAY: 'matchday',
  SQUAD: 'squad',
  TOURNAMENT: 'tournament',
  DREAMTEAM: 'dreamteam',
  SCOUTING: 'scouting',
  CHALLENGES: 'challenges',
  VAULT: 'vault',
  DUEL: 'duel'
};

export const TUTORIAL_STEPS = [
  // 1. Match Centre Steps
  {
    id: 'matchday-scoreboard',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Match Scoreboard & Status',
    description: 'Track real-time scores, match timer, team crests, and dynamic goalscorers. Everything updates directly from the physics-calibrated simulation engine.',
    target: '.scoreboard',
    placement: 'bottom'
  },
  {
    id: 'matchday-kickoff',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Kick Off the Match',
    description: 'Press Kick Off to start the 90-minute live simulation. You can pause, resume, or step through minute by minute at any time.',
    target: '#playBtn',
    placement: 'top'
  },
  {
    id: 'matchday-pace',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Simulation Pace & Speed',
    description: 'Choose a speed or skip to full time. Then select Try a different tactic above the scoreboard to replay the same opening and compare score, shots and expected goals.',
    target: '#speedControls',
    placement: 'top'
  },
  {
    id: 'matchday-pitch',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: '2D Tactical Pitch Radar',
    description: 'Watch all 22 players move with continuous spatial intelligence, press the ball carrier, execute passing lanes, and contest tackles.',
    target: '#pitchCanvas',
    placement: 'bottom'
  },
  {
    id: 'matchday-shouts',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Live Touchline Tactical Shouts',
    description: 'Shoot On Sight encourages earlier shots for ten minutes. Demand More helps players challenge the ball carrier sooner for ten minutes and costs extra stamina. Watch your bench before calling it.',
    target: '#managerShoutsPanel',
    placement: 'top'
  },
  {
    id: 'matchday-stats',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Comprehensive Match Statistics',
    description: 'Analyze live possession %, total shots, shots on target, corners, and xG (Expected Goals). xG estimates the quality of scoring chances created.',
    target: '#statistics',
    placement: 'top'
  },
  {
    id: 'matchday-wire',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Live Event Wire & Commentary',
    description: 'Read minute-by-minute play-by-play commentary, foul alerts, saves, offsides, and yellow/red cards with priority broadcast formatting.',
    target: '#eventFeed',
    placement: 'top'
  },
  {
    id: 'matchday-flow',
    mode: TUTORIAL_MODES.MATCHDAY,
    section: 'matchday',
    title: 'Cumulative xG Flow Curve',
    description: 'Inspect momentum swings and big scoring opportunities across 90 minutes with the dynamic cumulative xG visualizer.',
    target: '#flowPlot',
    placement: 'top'
  },

  // 2. Squad Lab Steps
  {
    id: 'squad-teams',
    mode: TUTORIAL_MODES.SQUAD,
    section: 'squad',
    title: 'Select Club or Senior National Team',
    description: 'Choose from over 350+ domestic clubs and FIFA top 150 senior national squads with authentic heraldry and deep rosters.',
    target: '.team-control',
    placement: 'right'
  },
  {
    id: 'squad-formation',
    mode: TUTORIAL_MODES.SQUAD,
    section: 'squad',
    title: 'Choose Tactical Formation',
    description: 'Switch between 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 5-3-2, or 3-4-3. Watch the tactical coordinate board reposition immediately.',
    target: '#formationButtons',
    placement: 'right'
  },
  {
    id: 'squad-tactics',
    mode: TUTORIAL_MODES.SQUAD,
    section: 'squad',
    title: 'Configure Tactical Identity',
    description: 'Fine-tune pressing intensity, passing tempo, pitch width, and overall team mentality (Defensive, Balanced, Attacking).',
    target: '#pressingRange',
    placement: 'right'
  },
  {
    id: 'squad-roster',
    mode: TUTORIAL_MODES.SQUAD,
    section: 'squad',
    title: 'Manage Starting XI & Substitutes',
    description: 'Inspect player overalls, energy bars, and roles. Click any starting player then a substitute to execute a tactical swap (up to 5 subs allowed per match).',
    target: '#squadList',
    placement: 'left'
  },

  // 3. Tournament Mode Steps
  {
    id: 'tournament-presets',
    mode: TUTORIAL_MODES.TOURNAMENT,
    section: 'tournament',
    title: 'Select Knockout Cup Competition',
    description: 'Choose prestigious presets like UEFA Champions Cup, World International Championship, or Domestic Supercup to initialize the bracket.',
    target: '#tournamentPresetsGrid',
    placement: 'bottom'
  },
  {
    id: 'tournament-bracket',
    mode: TUTORIAL_MODES.TOURNAMENT,
    section: 'tournament',
    title: 'Quarter-Finals to Grand Final',
    description: 'Track the knockout ladder! You can play your team’s matches on the live pitch or quick-simulate AI matchups. Drawn fixtures proceed to Extra Time and Penalties.',
    target: '#tournamentBracketWrapper',
    placement: 'bottom'
  },

  // 4. Dream Team Studio Steps
  {
    id: 'dream-intro',
    mode: TUTORIAL_MODES.DREAMTEAM,
    section: 'dreamteam',
    title: 'Build Your Ultimate XI',
    description: 'Draft your dream squad from all 16,396 footballers, including active world superstars and all-time footballing legends.',
    target: '#dreamFormationButtons',
    placement: 'bottom'
  },
  {
    id: 'dream-draft',
    mode: TUTORIAL_MODES.DREAMTEAM,
    section: 'dreamteam',
    title: 'Draft Starters & Bench',
    description: 'Click any starter or bench slot to open the player scout picker. Filter by position, tier, or country to find your favorite players.',
    target: '#dreamStartersGrid',
    placement: 'top'
  },
  {
    id: 'dream-deploy',
    mode: TUTORIAL_MODES.DREAMTEAM,
    section: 'dreamteam',
    title: 'Deploy Dream Team & Play',
    description: 'Challenge a real club or national team, or compete against a balanced AI Dream Team with reactive in-game tactical management.',
    target: '#deployDreamBtn',
    placement: 'bottom'
  },

  // 5. Global Scouting Steps
  {
    id: 'scout-search',
    mode: TUTORIAL_MODES.SCOUTING,
    section: 'scouting',
    title: 'Search All Footballers & Legends',
    description: 'Instant search across thousands of footballers by name, nationality, or club with real-time fuzzy keyword matching.',
    target: '#scoutSearchInput',
    placement: 'bottom'
  },
  {
    id: 'scout-filters',
    mode: TUTORIAL_MODES.SCOUTING,
    section: 'scouting',
    title: 'Position & Rating Filters',
    description: 'Filter players by tactical position (GK, DEF, MID, FWD), OVR tier (95+ Icons, 90+ World Class, 85+ Regulars), or club affiliation.',
    target: '#scoutRoleFilter',
    placement: 'bottom'
  },
  {
    id: 'scout-grid',
    mode: TUTORIAL_MODES.SCOUTING,
    section: 'scouting',
    title: 'FUT Cards & Radar Bio Inspector',
    description: 'Click any card in the grid to inspect the complete 6-attribute hexagon radar, physical ratings, and historic card badges.',
    target: '#scoutingPlayerGrid',
    placement: 'top'
  },

  // 6. 1v1 & Team vs Team Duel Steps
  {
    id: 'duel-tabs',
    mode: TUTORIAL_MODES.DUEL,
    section: 'duel',
    title: 'Format Quick Switcher',
    description: 'Switch between individual 1v1 Player Showdowns, 5v5 Team Match, or 11v11 Team Match with 1 click.',
    target: '.duel-mode-tabs',
    placement: 'bottom'
  },
  {
    id: 'duel-picker',
    mode: TUTORIAL_MODES.DUEL,
    section: 'duel',
    title: 'Choose Match Format & Challenges',
    description: 'In 1v1 mode, select Attack vs Defence, Dribbling, or Skill Challenges. In 5v5 / 11v11 mode, draft User 1 and User 2 squads with the strict 1 Player Per Nation rule.',
    target: '#duelTypeSelect',
    placement: 'bottom'
  },
  {
    id: 'duel-start',
    mode: TUTORIAL_MODES.DUEL,
    section: 'duel',
    title: 'Kick Off Challenge',
    description: 'Start the showdown! 1v1 duels simulate round-by-round duels on a mini-pitch arena; 5v5 & 11v11 team matches kick off directly on the Match Centre pitch.',
    target: '#startDuelBtn',
    placement: 'bottom'
  },

  {
    id:'rescue-takeover', mode:TUTORIAL_MODES.CHALLENGES, section:'challenges',
    title:'Take over a match', target:'#rescueCard', placement:'bottom',
    description:'Choose a scoreline to chase or defend. Take charge opens Match Centre at the takeover minute. Check your tired winger and remaining substitutions, change tactics, then press Resume.'
  },
  {
    id:'rescue-daily', mode:TUTORIAL_MODES.CHALLENGES, section:'challenges',
    title:'Play today’s rescue', target:'#dailyCard', placement:'bottom',
    description:'Every manager gets the same opening until midnight UTC. Starting uses your first attempt on this browser. Finish it to unlock Copy scorecard. Later starts are practice.'
  },
  {
    id:'budget-draft', mode:TUTORIAL_MODES.CHALLENGES, section:'challenges',
    title:'Spend your 100 credits', target:'#budgetCard', placement:'top',
    description:'Choose a starter or bench slot, search for a player in that position, and press Select player. Keep all sixteen players within budget, choose your opponent, then play.'
  },
  {
    id:'penalty-order', mode:TUTORIAL_MODES.CHALLENGES, section:'challenges',
    title:'Take penalties', target:'#penaltyCard', placement:'top',
    description:'Pick five different takers for each club. Choose where to shoot or dive. In two-player mode the shooter picks first, then hands the device to the keeper. A tie after five each goes to sudden death.'
  },
  {
    id:'survival-table', mode:TUTORIAL_MODES.CHALLENGES, section:'challenges',
    title:'Keep Brighton up', target:'#survivalCard', placement:'top',
    description:'Start one point behind Everton with five games left. Finish each fixture to update both clubs’ points. Fatigue carries over after partial recovery, and a red card rules a player out for the next game.'
  },
  // Replay Vault Steps
  {
    id: 'vault-list',
    mode: TUTORIAL_MODES.VAULT,
    section: 'vault',
    title: 'Your Saved Match History',
    description: 'Saved fixtures are preserved locally in browser storage. Replay any 90-minute simulation frame by frame or export JSON to share with friends.',
    target: '#vaultList',
    placement: 'top'
  },
  {
    id: 'vault-actions',
    mode: TUTORIAL_MODES.VAULT,
    section: 'vault',
    title: 'Save & Import Replays',
    description: 'Hit Save This Match from Match Centre to store a fixture here, or use Import JSON to load a shared replay from another player.',
    target: '.vault-actions',
    placement: 'bottom'
  }
];

export class TutorialController {
  constructor(options = {}) {
    this.navigateCallback = options.onNavigate || (() => {});
    this.state = 'IDLE'; // IDLE, WELCOME, ACTIVE, COMPLETED, SKIPPED
    this.currentStepIndex = 0;
    this.activeSteps = [];
    this.activeMode = null;
    this.storage = this.loadStorage();

    this.overlayEl = null;
    this.spotlightEl = null;
    this.cardEl = null;

    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {
      version: 1,
      status: 'pending',
      completedAt: null,
      completedModes: []
    };
  }

  saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
    } catch {}
  }

  isFirstLaunch() {
    return this.storage.status === 'pending';
  }

  markCompleted(mode) {
    if (mode && !this.storage.completedModes.includes(mode)) {
      this.storage.completedModes.push(mode);
    }
    const allCount = Object.keys(TUTORIAL_MODES).length;
    if (mode === 'all' || this.storage.completedModes.length >= allCount) {
      this.storage.status = 'completed';
      this.storage.completedAt = new Date().toISOString();
    }
    this.saveStorage();
  }

  markSkipped() {
    this.storage.status = 'skipped';
    this.saveStorage();
  }

  initUI() {
    if (document.getElementById('tutorialOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tutorial-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="tutorial-backdrop" id="tutorialBackdrop"></div>
      <div class="tutorial-spotlight" id="tutorialSpotlight"></div>
      <div class="tutorial-card" id="tutorialCard" role="dialog" aria-modal="true" aria-labelledby="tutCardTitle">
        <div class="tutorial-card-header">
          <div class="tutorial-badge-row">
            <span class="tutorial-step-badge" id="tutStepBadge">STEP 1 OF 8</span>
            <span class="tutorial-mode-badge" id="tutModeBadge">MATCH CENTRE</span>
          </div>
          <button type="button" class="tutorial-close-btn" id="tutCloseBtn" title="Close Tutorial (Esc)" aria-label="Close tutorial">✕</button>
        </div>
        <div class="tutorial-card-body">
          <h3 id="tutCardTitle">Instruction Title</h3>
          <p id="tutCardDesc">Instruction details explaining the interactive control.</p>
        </div>
        <div class="tutorial-card-footer">
          <button type="button" class="tutorial-btn tutorial-btn-subtle" id="tutSkipBtn">Skip Tutorial</button>
          <div class="tutorial-card-nav">
            <button type="button" class="tutorial-btn tutorial-btn-secondary" id="tutBackBtn">Back</button>
            <button type="button" class="tutorial-btn tutorial-btn-primary" id="tutNextBtn">Next →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    this.overlayEl = overlay;
    this.spotlightEl = document.getElementById('tutorialSpotlight');
    this.cardEl = document.getElementById('tutorialCard');

    document.getElementById('tutCloseBtn')?.addEventListener('click', () => this.endTutorial(true));
    document.getElementById('tutSkipBtn')?.addEventListener('click', () => this.endTutorial(true));
    document.getElementById('tutBackBtn')?.addEventListener('click', () => this.prevStep());
    document.getElementById('tutNextBtn')?.addEventListener('click', () => this.nextStep());
    document.getElementById('tutorialBackdrop')?.addEventListener('click', (e) => {
      // Don't close unintentionally on click outside, keep focus inside card
      e.stopPropagation();
    });
  }

  startTutorial(mode = null) {
    this.initUI();
    this.activeMode = mode;
    this.activeSteps = mode ? TUTORIAL_STEPS.filter(s => s.mode === mode) : [...TUTORIAL_STEPS];
    this.currentStepIndex = 0;
    this.state = 'ACTIVE';

    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('scroll', this.handleResize, { passive: true });
    window.addEventListener('keydown', this.handleKeyDown);

    this.overlayEl.classList.add('is-active');
    this.overlayEl.setAttribute('aria-hidden', 'false');

    this.showCurrentStep();
  }

  showCurrentStep() {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.activeSteps.length) {
      this.endTutorial(false);
      return;
    }

    const step = this.activeSteps[this.currentStepIndex];
    if (step.section) {
      this.navigateCallback(step.section);
    }

    // Allow UI 150ms to switch section and render DOM
    setTimeout(() => {
      let targetEl = document.querySelector(step.target);
      // Fallback if element not found in DOM
      if (!targetEl) {
        targetEl = document.body;
      }

      this.updateStepContent(step, targetEl);
      this.positionHighlight(targetEl, step.placement);
    }, 180);
  }

  updateStepContent(step, targetEl) {
    const badge = document.getElementById('tutStepBadge');
    const modeBadge = document.getElementById('tutModeBadge');
    const title = document.getElementById('tutCardTitle');
    const desc = document.getElementById('tutCardDesc');
    const backBtn = document.getElementById('tutBackBtn');
    const nextBtn = document.getElementById('tutNextBtn');

    if (badge) badge.textContent = `STEP ${this.currentStepIndex + 1} OF ${this.activeSteps.length}`;
    if (modeBadge) modeBadge.textContent = (step.mode || 'GUIDE').toUpperCase();
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.description;

    if (backBtn) {
      backBtn.disabled = this.currentStepIndex === 0;
      backBtn.style.opacity = this.currentStepIndex === 0 ? '0.4' : '1';
    }

    if (nextBtn) {
      const isLast = this.currentStepIndex === this.activeSteps.length - 1;
      nextBtn.textContent = isLast ? 'Finish Tour ✓' : 'Next →';
    }
  }

  positionHighlight(targetEl, placement = 'bottom') {
    if (!this.spotlightEl || !this.cardEl) return;

    if (targetEl === document.body || !targetEl) {
      this.spotlightEl.style.display = 'none';
      this.cardEl.style.top = '50%';
      this.cardEl.style.left = '50%';
      this.cardEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    setTimeout(() => {
      const rect = targetEl.getBoundingClientRect();
      const pad = 6;

      this.spotlightEl.style.display = 'block';
      this.spotlightEl.style.top = `${Math.max(0, rect.top - pad)}px`;
      this.spotlightEl.style.left = `${Math.max(0, rect.left - pad)}px`;
      this.spotlightEl.style.width = `${rect.width + pad * 2}px`;
      this.spotlightEl.style.height = `${rect.height + pad * 2}px`;

      const cardWidth = Math.min(380, window.innerWidth - 32);
      this.cardEl.style.width = `${cardWidth}px`;
      this.cardEl.style.transform = 'none';

      const cardRect = this.cardEl.getBoundingClientRect();
      let top, left;

      if (window.innerWidth <= 768) {
        // Mobile bottom sheet style
        this.cardEl.style.top = 'auto';
        this.cardEl.style.bottom = '16px';
        this.cardEl.style.left = '16px';
        this.cardEl.style.right = '16px';
        this.cardEl.style.width = 'calc(100% - 32px)';
        return;
      }

      this.cardEl.style.bottom = 'auto';
      this.cardEl.style.right = 'auto';

      if (placement === 'bottom' || (rect.bottom + cardRect.height + 20 < window.innerHeight)) {
        top = rect.bottom + 14;
        left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left));
      } else if (placement === 'top' || (rect.top - cardRect.height - 14 > 0)) {
        top = rect.top - cardRect.height - 14;
        left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left));
      } else if (placement === 'right' && (rect.right + cardWidth + 20 < window.innerWidth)) {
        top = Math.max(16, rect.top);
        left = rect.right + 16;
      } else {
        top = Math.max(16, rect.top);
        left = Math.max(16, rect.left - cardWidth - 16);
      }

      // Viewport safety clamping
      top = Math.max(16, Math.min(window.innerHeight - cardRect.height - 16, top));
      left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));

      this.cardEl.style.top = `${top}px`;
      this.cardEl.style.left = `${left}px`;
    }, 120);
  }

  nextStep() {
    if (this.currentStepIndex < this.activeSteps.length - 1) {
      this.currentStepIndex++;
      this.showCurrentStep();
    } else {
      this.endTutorial(false);
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.showCurrentStep();
    }
  }

  endTutorial(skipped = false) {
    this.state = skipped ? 'SKIPPED' : 'COMPLETED';

    if (skipped) {
      this.markSkipped();
    } else {
      this.markCompleted(this.activeMode);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.overlayEl) {
      this.overlayEl.classList.remove('is-active');
      this.overlayEl.setAttribute('aria-hidden', 'true');
    }
    if (this.spotlightEl) {
      this.spotlightEl.style.display = 'none';
    }
  }

  handleResize() {
    if (this.state !== 'ACTIVE') return;
    const step = this.activeSteps[this.currentStepIndex];
    if (step) {
      const targetEl = document.querySelector(step.target) || document.body;
      this.positionHighlight(targetEl, step.placement);
    }
  }

  handleKeyDown(e) {
    if (this.state !== 'ACTIVE') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.endTutorial(true);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      this.nextStep();
    } else if (e.key === 'ArrowLeft') {
      this.prevStep();
    }
  }
}
