/**
 * Custom tooltip system (rewritten based on older jQuery code):
 *  - Desktop: follows the mouse
 *  - Touch / Cordova: ignores hover; click shows a fullscreen popup overlay
 *  - Pipe characters (|) in tooltip text are converted to <br> line breaks
 *
 * Works with elements that have class "tooltip" and either a
 * `data-tooltip-html` or `title` attribute.
 */

let isTouchScreen = false;

// Detect touch once – then stop listening
if (typeof window !== 'undefined') {
  const setHasTouch = (): void => {
    isTouchScreen = true;
    window.removeEventListener('touchstart', setHasTouch);
  };
  window.addEventListener('touchstart', setHasTouch, false);
}

function getTooltipText(el: HTMLElement): string {
  return (
    el.getAttribute('data-tooltip-html') ||
    el.getAttribute('title') ||
    el.dataset?.originalTitle ||
    ''
  );
}

function closestTooltip(target: EventTarget | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && !el.classList?.contains('tooltip')) {
    el = el.parentElement;
  }
  return el;
}

// ─── Hover tooltip (desktop only) ─────────────────────────────

function handleMouseOver(e: MouseEvent): void {
  if ((window as any).cordova || isTouchScreen) return;
  const tooltipEl = closestTooltip(e.target);
  if (!tooltipEl) return;

  const titleAttr = getTooltipText(tooltipEl);
  if (!titleAttr) return;

  // Save + remove native title to suppress browser tooltip
  tooltipEl.dataset.originalTitle = titleAttr;
  tooltipEl.removeAttribute('title');
  tooltipEl.style.cursor = 'pointer';

  // Build tooltip HTML (pipe → <br>)
  const tooltipBody = titleAttr.replace(/[|]/g, '<br>');
  const tip = document.createElement('div');
  tip.id = 'tooltip';
  tip.innerHTML = tooltipBody;
  document.body.appendChild(tip);

  const bodyWidth = document.body.clientWidth;

  // Adjust width
  let toolWidth = tip.offsetWidth;
  if (toolWidth > 350) toolWidth = 350 + titleAttr.length / 2;
  if (toolWidth > 0.9 * bodyWidth) toolWidth = 0.9 * bodyWidth;
  tip.style.width = toolWidth + 'px';

  const toolHeight = tip.offsetHeight;
  const scrollTop = window.scrollY;
  const wndHeight = window.innerHeight;

  let offsY = 16;
  const remainingTop = e.pageY - scrollTop - toolHeight - 30;
  const remainingBottom = wndHeight + scrollTop - e.pageY - toolHeight - 25;
  if (remainingBottom < 0 && remainingTop > remainingBottom) {
    offsY = -toolHeight - 25;
  }

  const moveTT = (ev: MouseEvent): void => {
    let x = ev.pageX;
    if (x + toolWidth > bodyWidth - 15) x = bodyWidth - toolWidth - 15;
    tip.style.top = ev.pageY + offsY + 'px';
    tip.style.left = x + 'px';
  };

  moveTT(e);
  tip.style.opacity = '1';

  // Follow mouse
  (tooltipEl as any)._ttMove = moveTT;
  tooltipEl.addEventListener('mousemove', moveTT);
}

function handleMouseOut(e: MouseEvent): void {
  if ((window as any).cordova || isTouchScreen) return;
  const tooltipEl = closestTooltip(e.target);
  if (!tooltipEl) return;

  // Restore title
  const orig = tooltipEl.dataset.originalTitle;
  if (orig) {
    tooltipEl.setAttribute('title', orig);
    delete tooltipEl.dataset.originalTitle;
  }

  // Remove tooltip element + handler
  const tip = document.getElementById('tooltip');
  if (tip) tip.remove();
  if ((tooltipEl as any)._ttMove) {
    tooltipEl.removeEventListener('mousemove', (tooltipEl as any)._ttMove);
    delete (tooltipEl as any)._ttMove;
  }
}

// ─── Click popup (works on all devices) ────────────────────────

function handleClick(e: MouseEvent): void {
  const tooltipEl = closestTooltip(e.target);
  if (!tooltipEl) return;

  // If this tooltip element has been activated as an inline link,
  // don't show the tooltip popup — the link navigation handler will fire instead
  if (tooltipEl.hasAttribute('data-wylie')) return;

  let titleAttr = getTooltipText(tooltipEl);
  if (!titleAttr) return;

  const container = document.createElement('div');
  container.id = 'tooltip-container';
  container.innerHTML =
    '<div id="tooltip-background">' +
    '<div id="tooltip-fullscreen-text">' +
    titleAttr.replace(/[|]/g, '<br>') +
    '<br><br><a href="#" id="tooltip-close-btn">OK</a>' +
    '</div></div>';
  document.body.appendChild(container);

  const closeBtn = container.querySelector('#tooltip-close-btn') as HTMLAnchorElement | null;
  if (closeBtn) {
    closeBtn.addEventListener('click', (ev: MouseEvent) => {
      ev.preventDefault();
      container.remove();
    });
  }

  // Also hide the hover tooltip
  handleMouseOut(e);
}

// ─── Public API ────────────────────────────────────────────────

type TooltipCleanup = () => void;

/**
 * Bind tooltip handlers to all `.tooltip` elements inside a container.
 * Uses event delegation on the container.
 *
 * @param {HTMLElement} container – the parent element to delegate from
 * @returns {Function} cleanup – call this to unbind
 */
export function bindTooltips(container: HTMLElement | null): TooltipCleanup {
  if (!container) return () => {};

  const onOver = (e: Event): void => {
    if (closestTooltip((e as MouseEvent).target)) handleMouseOver(e as MouseEvent);
  };
  const onOut = (e: Event): void => {
    if (closestTooltip((e as MouseEvent).target)) handleMouseOut(e as MouseEvent);
  };
  const onClick = (e: Event): void => {
    if (closestTooltip((e as MouseEvent).target)) handleClick(e as MouseEvent);
  };

  container.addEventListener('mouseover', onOver);
  container.addEventListener('mouseout', onOut);
  container.addEventListener('click', onClick);

  return () => {
    container.removeEventListener('mouseover', onOver);
    container.removeEventListener('mouseout', onOut);
    container.removeEventListener('click', onClick);
    // Clean up any stray tooltip
    const tip = document.getElementById('tooltip');
    if (tip) tip.remove();
    const popup = document.getElementById('tooltip-container');
    if (popup) popup.remove();
  };
}
