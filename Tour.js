/**
 * Engine do tour interativo (Vanilla JavaScript).
 *
 * Guia: GUIA.md · tour-posicionamento.html
 * Template para novas telas: novo-tour-config.js
 *
 * Inicia apenas via start(), bindTrigger ou botão ? (sem auto-start/sessão).
 * Exports: VanillaTour, createTourTrigger, TourRegistry, TOUR_COLORS, TOUR_SLOTS
 */

/**
 * Plano cartesiano com origem no centro da div (eixo Y para baixo):
 *
 *        top-left      |  top-right
 *        --------------+--------------
 *        bottom-left   |  bottom-right
 *
 * Cada zona tem 2 posições (8 no total), pelo eixo de corte no meio da div:
 *
 *   split: 'vertical'   (v) → tooltip acima/abaixo, na metade horizontal da zona
 *   split: 'horizontal' (h) → tooltip à esquerda/direita, na metade vertical da zona
 *
 * Padrão: quadrant: 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right' → split vertical (v).
 * Customização lateral: quadrant: 'top-right', split: 'h'  (ou sufixo '-h' no quadrant).
 * Legado: position: 'top' | 'bottom' → centralizado acima/abaixo da div.
 */
export const TOUR_ZONE_IDS = ['top-right', 'top-left', 'bottom-left', 'bottom-right'];

export const TOUR_QUADRANT_DEFAULTS = {
  'top-right': { margin: 15, split: 'vertical', offsetX: 0, offsetY: 0 },
  'top-left': { margin: 15, split: 'vertical', offsetX: 0, offsetY: 0 },
  'bottom-left': { margin: 15, split: 'vertical', offsetX: 0, offsetY: 0 },
  'bottom-right': { margin: 15, split: 'vertical', offsetX: 0, offsetY: 0 }
};

/** Zonas padrão (split vertical). Use split: 'h' ou sufixo '-h' para posição lateral. */
export const TOUR_SLOTS = [
  'top-right', 'top-left', 'bottom-left', 'bottom-right',
  'top-right-h', 'top-left-h', 'bottom-left-h', 'bottom-right-h'
];

const ZONE_ALIASES = {
  'top-right': 'top-right',
  'top-left': 'top-left',
  'bottom-left': 'bottom-left',
  'bottom-right': 'bottom-right',
  right: 'top-right',
  'right-top': 'top-right',
  left: 'top-left',
  'left-top': 'top-left'
};

function normalizeZoneId(value) {
  if (!value) return null;
  const key = String(value).toLowerCase();
  return ZONE_ALIASES[key] || (TOUR_ZONE_IDS.includes(key) ? key : null);
}

const PLACEMENT_ALIASES = {
  left: 'left', right: 'right', center: 'center',
  top: 'top', bottom: 'bottom',
  start: 'left', end: 'right'
};

function normalizePlacement(value) {
  if (!value) return null;
  return PLACEMENT_ALIASES[value] || value;
}

function normalizeSplit(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v === 'h' || v === 'horizontal' || v === 'meio-horizontal') return 'horizontal';
  if (v === 'v' || v === 'vertical' || v === 'meio-vertical') return 'vertical';
  return null;
}

function parseQuadrantSpec(raw) {
  const result = { id: null, split: null, horizontal: null, vertical: null };

  if (!raw || typeof raw !== 'string') return result;

  const namedSlot = raw.match(
    /^(top-right|top-left|bottom-left|bottom-right)-(h|v|horizontal|vertical)$/i
  );
  if (namedSlot) {
    result.id = namedSlot[1].toLowerCase();
    result.split = normalizeSplit(namedSlot[2]);
    return result;
  }

  result.id = normalizeZoneId(raw);
  return result;
}

function resolveAlignX(zoneId, horizontal) {
  const h = normalizePlacement(horizontal) || 'center';
  if (h === 'center') return 'center';
  const extendsRight = zoneId === 'top-right' || zoneId === 'bottom-right';
  if (extendsRight) return h === 'left' ? 'end' : 'start';
  return h === 'right' ? 'end' : 'start';
}

function resolveAlignY(zoneId, vertical) {
  const v = normalizePlacement(vertical) || 'center';
  if (v === 'center') return 'center';
  const isUpper = zoneId === 'top-right' || zoneId === 'top-left';
  if (isUpper) return v === 'bottom' ? 'end' : 'start';
  return v === 'top' ? 'start' : 'end';
}

function placementToAlign(zoneId, horizontal, vertical) {
  return {
    alignX: resolveAlignX(zoneId, horizontal),
    alignY: resolveAlignY(zoneId, vertical)
  };
}

function inferSplitFromLegacy(zoneId, horizontal, vertical) {
  const h = normalizePlacement(horizontal);
  const v = normalizePlacement(vertical);
  if (h === 'center' && v !== 'center') return 'vertical';
  if (v === 'center' && h !== 'center') return 'horizontal';
  const lateral = zoneId === 'top-right' || zoneId === 'bottom-right';
  return lateral ? 'horizontal' : 'vertical';
}

function getSlotGeometry(rect, zoneId, split) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const xRightHalf = cx + rect.width / 4;
  const xLeftHalf = cx - rect.width / 4;
  const yUpperHalf = cy - rect.height / 4;
  const yLowerHalf = cy + rect.height / 4;

  if (split === 'vertical') {
    const anchorX = {
      'top-right': xRightHalf,
      'top-left': xLeftHalf,
      'bottom-left': xLeftHalf,
      'bottom-right': xRightHalf
    }[zoneId];
    const edgeY = {
      'top-right': rect.top,
      'top-left': rect.top,
      'bottom-left': rect.bottom,
      'bottom-right': rect.bottom
    }[zoneId];
    return { mode: 'vertical', anchorX, edgeY, targetX: anchorX, targetY: edgeY };
  }

  const anchorY = {
    'top-right': yUpperHalf,
    'top-left': yUpperHalf,
    'bottom-left': yLowerHalf,
    'bottom-right': yLowerHalf
  }[zoneId];
  const edgeX = {
    'top-right': rect.right,
    'top-left': rect.left,
    'bottom-left': rect.left,
    'bottom-right': rect.right
  }[zoneId];
  return { mode: 'horizontal', anchorY, edgeX, targetX: edgeX, targetY: anchorY };
}

function positionSlot(rect, geometry, margin, tw, th, scrollY, offsetX, offsetY) {
  let left;
  let top;

  if (geometry.mode === 'vertical') {
    left = geometry.anchorX - tw / 2 + offsetX;
    top = (
      geometry.edgeY === rect.top
        ? geometry.edgeY - margin - th
        : geometry.edgeY + margin
    ) + scrollY + offsetY;
  } else {
    top = geometry.anchorY - th / 2 + scrollY + offsetY;
    left = (
      geometry.edgeX === rect.left
        ? geometry.edgeX - margin - tw
        : geometry.edgeX + margin
    ) + offsetX;
  }

  return {
    left,
    top,
    targetX: geometry.targetX,
    targetY: geometry.targetY + scrollY
  };
}

/** Paleta padrão — edite aqui ou sobrescreva via config.settings.colors */
export const TOUR_COLORS = {
  primary: '#75c46a',
  overlay: 'rgba(0, 0, 0, 0.7)',
  tooltipBg: '#ffffff',
  tooltipShadow: 'rgba(0, 0, 0, 0.2)',
  title: '#111111',
  content: '#444444',
  progressBar: '#e5e7eb',
  footer: '#75c46a',
  navText: '#262626',
  helpBtnBg: '#75c46a',
  helpBtnBorder: '#ffffff',
  helpBtnIcon: '#000000',
  spotlightBorder: '#75c46a',
  glow: 'rgba(117, 196, 106, 0.3)',
  glowPulse: 'rgba(117, 196, 106, 0.12)',
  arrow: '#ffffff'
};

const TOUR_CSS = `
.v-tour-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 9997; pointer-events: none; display: none;
  background: var(--vt-overlay);
}
.v-tour-spotlight {
  position: fixed; z-index: 9997; pointer-events: none; box-sizing: border-box;
  border: 2px solid var(--vt-spotlightBorder); border-radius: 6px;
  background: transparent; display: none;
}
.v-tour-spotlight::after {
  content: ''; position: absolute; inset: -4px; border-radius: 8px;
  box-shadow: 0 0 0 4px var(--vt-glow);
  animation: v-tour-pulse-glow 1.6s ease-in-out infinite; pointer-events: none;
}
.v-tour-spotlight--step-change {
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}
body.v-tour-active .main-menu .navigation > li > ul { transition: none !important; }
@keyframes v-tour-pulse-glow {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 4px var(--vt-glow); }
  50% { opacity: 0.7; box-shadow: 0 0 0 8px var(--vt-glowPulse); }
}
.v-tour-blocker {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 9998; display: none;
}
.v-tour-blocker--interactive { pointer-events: none; }
.v-tour-tooltip {
  position: absolute; background: var(--vt-tooltipBg); border-radius: 8px;
  z-index: 9999; width: 320px; max-width: calc(100vw - 20px);
  box-shadow: 0 10px 25px var(--vt-tooltipShadow);
  display: none; font-family: sans-serif; pointer-events: auto;
}
.v-tour-tooltip--welcome {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
}
.v-tour-tooltip[role="dialog"] { outline: none; }
.v-tour-arrow {
  position: absolute; width: 16px; height: 16px;
  background: var(--vt-arrow); transform: rotate(45deg); z-index: -1;
}
.v-tour-body {
  padding: 20px; background: var(--vt-tooltipBg);
  border-top-left-radius: 8px; border-top-right-radius: 8px;
}
.v-tour-progress-text {
  text-align: right; font-size: 13px; font-weight: bold; margin-bottom: 6px;
  color: var(--vt-primary);
}
.v-tour-progress-bar {
  height: 4px; background: var(--vt-progressBar); border-radius: 2px;
  margin-bottom: 12px; overflow: hidden;
}
.v-tour-progress-fill {
  height: 100%; border-radius: 2px; transition: width 0.3s ease;
  background: var(--vt-primary);
}
.v-tour-title { margin: 0 0 10px 0; font-size: 20px; color: var(--vt-title); }
.v-tour-content { margin: 0; font-size: 14px; color: var(--vt-content); line-height: 1.5; }
.v-tour-footer {
  padding: 12px 20px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;
  display: flex; justify-content: space-between; align-items: center;
  background: var(--vt-footer);
}
.v-tour-skip, .v-tour-prev, .v-tour-next {
  color: var(--vt-navText); font-size: 13px; font-weight: 500;
}
.v-tour-skip { text-decoration: underline; cursor: pointer; }
.v-tour-nav { display: flex; gap: 15px; align-items: center; }
.v-tour-prev, .v-tour-next { cursor: pointer; }
.v-tour-prev--disabled { cursor: default; opacity: 0.5; }
.v-tour-help-btn {
  position: fixed; bottom: 38px; left: 20px; z-index: 9996;
  border-radius: 50%; width: 28px; height: 28px; display: none;
  align-items: center; justify-content: center;
  border: 2px solid var(--vt-helpBtnBorder); cursor: pointer;
  box-shadow: 0 4px 10px var(--vt-tooltipShadow);
  transition: transform 0.2s; background-color: var(--vt-helpBtnBg);
}
.v-tour-help-btn:hover { transform: scale(1.1); }
.v-tour-help-btn i { font-size: 12px; color: var(--vt-helpBtnIcon); }
`;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function injectTourStyles() {
  if (document.getElementById('v-tour-styles')) return;
  const style = document.createElement('style');
  style.id = 'v-tour-styles';
  style.textContent = TOUR_CSS;
  document.head.appendChild(style);
}

function applyTourColors(colors) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--vt-${key}`, value);
  });
}

function resolveTourColors(settings = {}) {
  const legacy = {};
  if (settings.primaryColor) legacy.primary = settings.primaryColor;
  if (settings.overlayColor) legacy.overlay = settings.overlayColor;

  return { ...TOUR_COLORS, ...legacy, ...(settings.colors || {}) };
}

function resolveTourQuadrants(settings = {}) {
  const merged = {};
  TOUR_ZONE_IDS.forEach((zoneId) => {
    merged[zoneId] = {
      ...TOUR_QUADRANT_DEFAULTS[zoneId],
      ...(settings.quadrants?.[zoneId] || {})
    };
  });
  return merged;
}

export class VanillaTour {
  constructor(config) {
    const defaults = {
      padding: 10,
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Finalizar',
      showHelpButton: true,
      lockScroll: true,
      colors: {}
    };

    this.steps = config.steps;
    this.settings = {
      ...defaults,
      ...config.settings,
      quadrants: resolveTourQuadrants(config.settings || {})
    };
    this.colors = resolveTourColors(this.settings);
    this.helpButtonId = config.helpButtonId || `v-help-btn-${Date.now()}`;
    this.currentStep = 0;
    this._activeTarget = null;
    this._resizeObserver = null;
    this._trackRaf = null;
    this._stepChangeTimer = null;
    this._lastRectKey = '';

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.prevenirPadrao = this.prevenirPadrao.bind(this);
    this._onReposition = this._onReposition.bind(this);
    this._trackFrame = this._trackFrame.bind(this);

    injectTourStyles();
    applyTourColors(this.colors);
    this.init();
  }

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'v-tour-overlay';

    this.blocker = document.createElement('div');
    this.blocker.className = 'v-tour-blocker';

    this.spotlight = document.createElement('div');
    this.spotlight.className = 'v-tour-spotlight';

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'v-tour-tooltip';
    this.tooltip.setAttribute('role', 'dialog');
    this.tooltip.setAttribute('aria-modal', 'true');
    this.tooltip.tabIndex = -1;

    if (this.settings.showHelpButton) {
      this.helpButton = document.createElement('button');
      this.helpButton.id = this.helpButtonId;
      this.helpButton.type = 'button';
      this.helpButton.className = 'v-tour-help-btn';
      this.helpButton.setAttribute('aria-label', 'Iniciar tour de ajuda');
      this.helpButton.innerHTML = '<i class="fa fa-question"></i>';
      this.helpButton.onclick = () => this.start();
      document.body.appendChild(this.helpButton);
    }

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.blocker);
    document.body.appendChild(this.spotlight);
    document.body.appendChild(this.tooltip);

    window.addEventListener('resize', this._onReposition);
    window.addEventListener('scroll', this._onReposition, true);

    if (this.settings.showHelpButton) {
      this._showHelpButton();
    }
  }

  _isSpotlightActive() {
    return this.spotlight.style.display === 'block';
  }

  _onReposition() {
    if (this._isSpotlightActive()) {
      this._syncSpotlight(false);
    }
  }

  _getBounds(rect, padding) {
    return {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  }

  _applySpotlight(rect, animate = false) {
    const b = this._getBounds(rect, this.settings.padding);

    this.overlay.style.display = 'none';
    this.spotlight.style.display = 'block';
    this.spotlight.style.top = `${b.top}px`;
    this.spotlight.style.left = `${b.left}px`;
    this.spotlight.style.width = `${b.width}px`;
    this.spotlight.style.height = `${b.height}px`;
    this.spotlight.style.boxShadow = `0 0 0 9999px ${this.colors.overlay}`;

    if (animate) {
      this.spotlight.classList.add('v-tour-spotlight--step-change');
      clearTimeout(this._stepChangeTimer);
      this._stepChangeTimer = setTimeout(() => {
        this.spotlight.classList.remove('v-tour-spotlight--step-change');
      }, 160);
    }
  }

  _syncSpotlight(animate = false) {
    const step = this.steps[this.currentStep];
    if (!step || step.welcome || !step.element) return null;

    const target = this._activeTarget || document.querySelector(step.element);
    if (!target) return null;

    const rect = target.getBoundingClientRect();
    this._applySpotlight(rect, animate);
    return { rect, step };
  }

  _disconnectObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._activeTarget = null;
    this._stopTracking();
  }

  _observeTarget(target) {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._trackRaf) {
      cancelAnimationFrame(this._trackRaf);
      this._trackRaf = null;
    }

    if (!target) return;

    this._activeTarget = target;

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._syncSpotlight(false));
      this._resizeObserver.observe(target);
    }

    this._trackRaf = requestAnimationFrame(this._trackFrame);
  }

  _stopTracking() {
    if (this._trackRaf) {
      cancelAnimationFrame(this._trackRaf);
      this._trackRaf = null;
    }
    clearTimeout(this._stepChangeTimer);
    this.spotlight?.classList.remove('v-tour-spotlight--step-change');
  }

  _trackFrame() {
    if (!this._isSpotlightActive()) return;

    const step = this.steps[this.currentStep];
    if (!step || step.welcome || !step.element) return;

    const target = this._activeTarget;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const rectKey = `${rect.top.toFixed(1)}|${rect.left.toFixed(1)}|${rect.width.toFixed(1)}|${rect.height.toFixed(1)}`;

    this._applySpotlight(rect, false);

    if (rectKey !== this._lastRectKey) {
      this._lastRectKey = rectKey;
      this.positionTooltip(rect, step);
    }

    this._trackRaf = requestAnimationFrame(this._trackFrame);
  }

  _shouldSkipStep(step, direction = 1) {
    if (step.beforeShow && typeof step.beforeShow === 'function' && !step.beforeShow()) {
      if (direction > 0) this.next(true);
      else this.prev(true);
      return true;
    }
    return false;
  }

  _exitStep(currentStep, nextStep) {
    if (!currentStep) return;

    const leavingMenu = currentStep.isMenu && nextStep && !nextStep.isMenu;
    const betweenMenus = currentStep.isMenu && nextStep?.isMenu;

    if (leavingMenu && typeof this.settings.onLeaveMenu === 'function') {
      this.settings.onLeaveMenu();
      this._menuWasOpen = false;
    } else if (!betweenMenus && currentStep.onExit && typeof currentStep.onExit === 'function') {
      currentStep.onExit();
    }
  }

  _paintTarget(step, target, animate = false) {
    const rect = target.getBoundingClientRect();
    this._lastRectKey = '';

    if (!step.isMenu && this._menuWasOpen) {
      this.settings.onLeaveMenu?.();
      this._menuWasOpen = false;
    }
    if (step.isMenu) this._menuWasOpen = true;

    this.tooltip.classList.remove('v-tour-tooltip--welcome');
    this.blocker.style.display = 'block';
    this.blocker.classList.toggle('v-tour-blocker--interactive', !!step.allowInteraction);
    this._applySpotlight(rect, animate);
    this._observeTarget(target);

    this._buildTooltip(step, rect);
    this.positionTooltip(rect, step);
    this.bindEvents();
    this.tooltip.focus();
  }

  _resolveQuadrant(step) {
    const raw = step.quadrant || step.position || 'bottom';

    if (!step.quadrant && (raw === 'top' || raw === 'bottom')) {
      const base = TOUR_QUADRANT_DEFAULTS['bottom-right'];
      return {
        id: 'centered',
        config: {
          margin: step.margin ?? base.margin,
          offsetX: step.offsetX ?? base.offsetX,
          offsetY: step.offsetY ?? base.offsetY,
          centered: raw
        }
      };
    }

    const parsed = parseQuadrantSpec(raw);
    const id = parsed.id || normalizeZoneId(raw) || 'bottom-right';
    const defaults = this.settings.quadrants?.[id] || TOUR_QUADRANT_DEFAULTS[id];
    const overrides = step.quadrantOverrides || {};

    const horizontal =
      step.horizontal ||
      step.placement?.horizontal ||
      overrides.horizontal ||
      parsed.horizontal ||
      defaults.horizontal;

    const vertical =
      step.vertical ||
      step.placement?.vertical ||
      overrides.vertical ||
      parsed.vertical ||
      defaults.vertical;

    const explicitSplit = normalizeSplit(
      step.split || step.placement?.split || overrides.split || parsed.split
    );
    const split = explicitSplit ||
      (parsed.horizontal || parsed.vertical || horizontal || vertical
        ? inferSplitFromLegacy(id, horizontal, vertical)
        : (defaults.split || 'vertical'));

    const useLegacyAlign = !!(parsed.horizontal || parsed.vertical);

    const config = {
      ...defaults,
      ...overrides,
      split,
      horizontal,
      vertical,
      useLegacyAlign,
      ...(useLegacyAlign ? placementToAlign(id, horizontal, vertical) : {})
    };

    return { id, config };
  }

  _positionCenteredEdge(rect, config) {
    const scrollY = window.scrollY;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const cx = rect.left + rect.width / 2;
    const { margin, offsetX = 0, offsetY = 0, centered } = config;

    const left = cx - tw / 2 + offsetX;
    let top;
    let targetY;

    if (centered === 'top') {
      top = rect.top - margin - th + scrollY + offsetY;
      targetY = rect.top + scrollY;
    } else {
      top = rect.bottom + margin + scrollY + offsetY;
      targetY = rect.bottom + scrollY;
    }

    return { top, left, targetX: cx, targetY };
  }

  _positionInQuadrant(rect, zoneId, config) {
    if (config.centered) {
      return this._positionCenteredEdge(rect, config);
    }

    const scrollY = window.scrollY;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const { margin, offsetX = 0, offsetY = 0, split = 'vertical' } = config;

    if (!config.useLegacyAlign) {
      const geometry = getSlotGeometry(rect, zoneId, split);
      return positionSlot(rect, geometry, margin, tw, th, scrollY, offsetX, offsetY);
    }

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const alignX = config.alignX || 'center';
    const alignY = config.alignY || 'center';

    const xAnchor = {
      'top-right': cx + margin,
      'top-left': cx - margin,
      'bottom-left': cx - margin,
      'bottom-right': cx + margin
    }[zoneId] ?? cx + margin;

    const yAnchor = {
      'top-right': cy - margin,
      'top-left': cy - margin,
      'bottom-left': cy + margin,
      'bottom-right': cy + margin
    }[zoneId] ?? cy + margin;

    let left;
    if (alignX === 'start') left = xAnchor + offsetX;
    else if (alignX === 'end') left = xAnchor - tw + offsetX;
    else left = xAnchor - tw / 2 + offsetX;

    let top;
    if (alignY === 'start') top = yAnchor + scrollY + offsetY;
    else if (alignY === 'end') top = yAnchor - th + scrollY + offsetY;
    else top = yAnchor - th / 2 + scrollY + offsetY;

    return { top, left, targetX: cx, targetY: cy + scrollY };
  }

  _clampTooltipToViewport(top, left) {
    const padding = 10;
    const scrollY = window.scrollY;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;

    const tooltipRect = this.tooltip.getBoundingClientRect();

    if (tooltipRect.left < padding) {
      left = padding;
    } else if (tooltipRect.right > window.innerWidth - padding) {
      left = window.innerWidth - tw - padding;
    }

    if (tooltipRect.top < padding) {
      top = padding + scrollY;
    } else if (tooltipRect.bottom > window.innerHeight - padding) {
      top = window.innerHeight - th - padding + scrollY;
    }

    return { top, left };
  }

  _positionArrow(targetX, targetY, top, left) {
    const arrow = document.getElementById('v-arrow');
    if (!arrow) return;

    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const tMidX = left + tw / 2;
    const tMidY = top + th / 2;
    const dx = targetX - tMidX;
    const dy = targetY - tMidY;

    arrow.style.top = '';
    arrow.style.bottom = '';
    arrow.style.left = '';
    arrow.style.right = '';
    arrow.style.background = this.colors.arrow;

    if (Math.abs(dy) >= Math.abs(dx)) {
      const arrowPos = Math.max(15, Math.min(tw - 25, targetX - left - 8));
      if (dy > 0) {
        arrow.style.bottom = '-8px';
        arrow.style.left = `${arrowPos}px`;
        arrow.style.background = this.colors.footer;
      } else {
        arrow.style.top = '-8px';
        arrow.style.left = `${arrowPos}px`;
      }
      return;
    }

    const arrowPos = Math.max(15, Math.min(th - 25, targetY - top - 8));
    if (dx > 0) {
      arrow.style.right = '-8px';
      arrow.style.top = `${arrowPos}px`;
    } else {
      arrow.style.left = '-8px';
      arrow.style.top = `${arrowPos}px`;
    }
  }

  _waitAndPaint(step) {
    const shouldAnimate = step.animate !== false;
    const shouldScroll = step.scroll !== false;
    const maxWait = step.actionMaxWait ?? 200;
    const start = performance.now();
    let lastHeight = -1;
    let stableFrames = 0;

    const tryPaint = () => {
      const target = document.querySelector(step.element);

      if (!target) {
        if (performance.now() - start < maxWait) {
          requestAnimationFrame(tryPaint);
          return;
        }
        this.next(true);
        return;
      }

      if (step.action) {
        const height = target.getBoundingClientRect().height;
        if (Math.abs(height - lastHeight) < 0.5) stableFrames++;
        else {
          stableFrames = 0;
          lastHeight = height;
        }
        if (stableFrames < 1 && performance.now() - start < maxWait) {
          requestAnimationFrame(tryPaint);
          return;
        }
      }

      if (shouldScroll) {
        const style = window.getComputedStyle(target);
        if (style.position !== 'fixed') {
          target.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }

      requestAnimationFrame(() => {
        const el = document.querySelector(step.element);
        if (el) this._paintTarget(step, el, shouldAnimate);
        else this.next(true);
      });
    };

    if (step.action && typeof step.action === 'function') {
      step.action();
      requestAnimationFrame(tryPaint);
    } else {
      requestAnimationFrame(tryPaint);
    }
  }

  renderStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    if (this._shouldSkipStep(step)) return;

    if (step.welcome || !step.element) {
      this._renderWelcomeStep(step);
      return;
    }

    this._waitAndPaint(step);
  }

  _renderWelcomeStep(step) {
    this._disconnectObserver();
    this.overlay.style.display = 'block';
    this.spotlight.style.display = 'none';
    this.blocker.style.display = 'block';
    this.blocker.classList.remove('v-tour-blocker--interactive');

    this.tooltip.classList.add('v-tour-tooltip--welcome');
    this._buildTooltip(step, null);
    this.bindEvents();
    this.tooltip.focus();
  }

  _buildTooltip(step, rect) {
    const isLast = this.currentStep === this.steps.length - 1;
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    const isWelcome = step.welcome || !step.element;

    this.tooltip.setAttribute('aria-labelledby', 'v-tour-title');
    this.tooltip.style.display = 'block';

    this.tooltip.innerHTML = `
      ${!isWelcome ? '<div class="v-tour-arrow" id="v-arrow"></div>' : ''}
      <div class="v-tour-body">
        <div class="v-tour-progress-text" aria-live="polite">
          Passo ${this.currentStep + 1} de ${this.steps.length}
        </div>
        <div class="v-tour-progress-bar" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100">
          <div class="v-tour-progress-fill" style="width: ${progress}%;"></div>
        </div>
        <h3 class="v-tour-title" id="v-tour-title">${escapeHtml(step.title)}</h3>
        <p class="v-tour-content">${escapeHtml(step.content)}</p>
      </div>
      <div class="v-tour-footer">
        <a href="#" class="v-tour-skip" id="v-skip">Pular Tutorial</a>
        <div class="v-tour-nav">
          <span id="v-prev" class="v-tour-prev ${this.currentStep === 0 ? 'v-tour-prev--disabled' : ''}">
            <i class="fa fa-chevron-left" style="font-size: 10px; margin-right: 4px;"></i> ${escapeHtml(this.settings.prevBtnText)}
          </span>
          <span id="v-next" class="v-tour-next">
            ${isLast
              ? escapeHtml(this.settings.doneBtnText)
              : escapeHtml(this.settings.nextBtnText) + ' <i class="fa fa-chevron-right" style="font-size: 10px; margin-left: 4px;"></i>'}
          </span>
        </div>
      </div>
    `;
  }

  positionTooltip(rect, stepOrPos) {
    if (!rect) return;

    const step = typeof stepOrPos === 'object' ? stepOrPos : { position: stepOrPos };
    const { id, config } = this._resolveQuadrant(step);
    let { top, left, targetX, targetY } = this._positionInQuadrant(rect, id, config);

    ({ top, left } = this._clampTooltipToViewport(top, left));

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this._positionArrow(targetX, targetY, top, left);
  }

  prevenirPadrao(e) {
    if (this.settings.lockScroll) e.preventDefault();
  }

  bindEvents() {
    document.getElementById('v-next').onclick = () => this.next();
    const prev = document.getElementById('v-prev');
    if (prev && this.currentStep > 0) prev.onclick = () => this.prev();
    const skip = document.getElementById('v-skip');
    if (skip) {
      skip.onclick = (e) => {
        e.preventDefault();
        this.stop();
      };
    }
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
    else if (e.key === 'Escape') this.stop();
  }

  _showHelpButton() {
    if (this.helpButton) this.helpButton.style.display = 'flex';
  }

  _hideHelpButton() {
    if (this.helpButton) this.helpButton.style.display = 'none';
  }

  start() {
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('wheel', this.prevenirPadrao, { passive: false });
    window.removeEventListener('touchmove', this.prevenirPadrao, { passive: false });

    this._stopTracking();
    this.currentStep = 0;
    this._menuWasOpen = false;
    this._lastRectKey = '';
    this._hideHelpButton();
    document.body.classList.add('v-tour-active');

    if (this.settings.lockScroll) {
      window.addEventListener('wheel', this.prevenirPadrao, { passive: false });
      window.addEventListener('touchmove', this.prevenirPadrao, { passive: false });
    }

    this.renderStep();
    document.addEventListener('keydown', this.handleKeyDown);
  }

  next(fromSkip = false) {
    const currentStep = this.steps[this.currentStep];
    const nextIndex = this.currentStep + 1;

    if (!fromSkip) {
      this._exitStep(currentStep, this.steps[nextIndex]);
    }

    if (nextIndex < this.steps.length) {
      this.currentStep = nextIndex;
      this.renderStep();
    } else {
      this.stop();
    }
  }

  prev(fromSkip = false) {
    const currentStep = this.steps[this.currentStep];
    const prevIndex = this.currentStep - 1;

    if (!fromSkip) {
      this._exitStep(currentStep, this.steps[prevIndex]);
    }

    if (prevIndex >= 0) {
      this.currentStep = prevIndex;
      this.renderStep();
    }
  }

  stop() {
    const step = this.steps[this.currentStep];
    if (step?.onExit && typeof step.onExit === 'function') step.onExit();

    this._disconnectObserver();
    this.overlay.style.display = 'none';
    this.spotlight.style.display = 'none';
    this.blocker.style.display = 'none';
    this.tooltip.style.display = 'none';
    this.tooltip.classList.remove('v-tour-tooltip--welcome');

    this._showHelpButton();
    document.body.classList.remove('v-tour-active');
    if (this._menuWasOpen) {
      this.settings.onLeaveMenu?.();
      this._menuWasOpen = false;
    }

    if (this.settings.lockScroll) {
      window.removeEventListener('wheel', this.prevenirPadrao, { passive: false });
      window.removeEventListener('touchmove', this.prevenirPadrao, { passive: false });
    }

    document.removeEventListener('keydown', this.handleKeyDown);
  }

  destroy() {
    this._stopTracking();
    this.stop();
    window.removeEventListener('resize', this._onReposition);
    window.removeEventListener('scroll', this._onReposition, true);
    this.overlay?.remove();
    this.blocker?.remove();
    this.spotlight?.remove();
    this.tooltip?.remove();
    this.helpButton?.remove();
  }
}

function resolveTourTriggerElements(target) {
  if (!target) return [];
  if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
  if (target instanceof Element) return [target];
  if (typeof target.length === 'number') {
    return Array.from(target).filter((el) => el instanceof Element);
  }
  return [];
}

/**
 * Expõe funções para iniciar o tour manualmente ou vinculá-lo a elementos da página.
 * Use no arquivo de configuração do tour (ex.: home-tour-config.js).
 *
 * @param {VanillaTour} tour - Instância já criada
 * @returns {{ start: Function, bindTrigger: Function }}
 *
 * @example
 * const { start, bindTrigger } = createTourTrigger(homeTour);
 * bindTrigger('#btn-ver-tour'); // clique no elemento inicia o tour
 * start(); // inicia diretamente (ex.: outro script ou onclick via módulo)
 */
export function createTourTrigger(tour) {
  function start(event) {
    event?.preventDefault?.();
    tour.start();
  }

  function bindTrigger(target) {
    resolveTourTriggerElements(target).forEach((el) => {
      el.addEventListener('click', start);
    });
    return start;
  }

  return { start, bindTrigger };
}

/** Registro global de tours por página (para reuso futuro no menu de ajuda). */
const _registry = new Map();

export const TourRegistry = {
  register(name, tour) {
    _registry.set(name, tour);
  },
  get(name) {
    return _registry.get(name);
  },
  start(name) {
    const tour = _registry.get(name);
    if (tour) tour.start();
  }
};
