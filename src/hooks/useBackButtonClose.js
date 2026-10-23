import { useEffect, useRef } from 'react';

// ── Overlay back-button guard ────────────────────────────────────────────────
//
// Overlays (modals, sheets, drawers, dialogs, full-screen panels) keep the back
// button closing the panel instead of leaving the page.
//
// While at least one overlay is open we hold ONE shared history entry, owned by
// a single global listener. One entry for the whole stack (instead of one per
// overlay) keeps the history perfectly balanced: opening and closing panels
// never navigates the app, and no stray pop can close the wrong panel.
//
// Every history call is wrapped: if the browser refuses a traversal (embedded
// frames / restricted contexts) the overlay still closes from its own X instead
// of throwing during React's commit and blanking the whole app.

const GUARD_KEY = 'appOverlayGuard';

const _overlays = [];       // open overlays, in opening order
let _holdsGuard = false;    // our guard entry is on top of the history
let _ignoreBackUntil = 0;   // ignore the pop produced by our own history.back()
let _listening = false;
let _seq = 0;

function _isGuardEntry() {
  try {
    return window.history?.state?.[GUARD_KEY] === true;
  } catch {
    return false;
  }
}

function _pushGuard() {
  if (_holdsGuard) return;
  try {
    window.history.pushState({ [GUARD_KEY]: true }, '');
    _holdsGuard = true;
  } catch {
    // History unavailable (restricted context): overlays still close from their X.
  }
}

function _releaseGuard() {
  if (!_holdsGuard) return;
  _holdsGuard = false;
  // Something else already consumed the entry (a page navigation, a back press).
  if (!_isGuardEntry()) return;
  try {
    _ignoreBackUntil = Date.now() + 600;
    window.history.back();
  } catch {
    // Ignore: never let history break closing a modal.
  }
}

function _handlePopState() {
  if (Date.now() < _ignoreBackUntil) return; // our own programmatic pop
  if (_overlays.length === 0) return;        // nothing open — leave navigation alone
  if (_isGuardEntry()) return;               // guard still on top: a page navigation popped
  _holdsGuard = false;                       // the user's back press consumed the guard
  const top = _overlays.pop();
  top?.close();
  if (_overlays.length > 0) _pushGuard();    // keep guarding the panels still open
}

function _ensureListener() {
  if (_listening || typeof window === 'undefined') return;
  _listening = true;
  window.addEventListener('popstate', _handlePopState);
}

export function hasOpenOverlay() {
  return _overlays.length > 0;
}

export function isInternalBack() {
  return Date.now() < _ignoreBackUntil;
}

/**
 * Closes an overlay when the back button is pressed and keeps history balanced.
 * Used by the shared UI components (Dialog, Sheet, Drawer, AlertDialog) and by
 * full-screen panels that stay mounted only while open.
 *
 * @param {boolean} isOpen - Whether the overlay is open
 * @param {Function} onClose - Callback to close the overlay
 */
export function useBackButtonOverlay(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `overlay-${++_seq}`;

  useEffect(() => {
    if (!isOpen) return;
    const id = idRef.current;
    _overlays.push({ id, close: () => onCloseRef.current?.() });
    _ensureListener();
    _pushGuard();

    return () => {
      const i = _overlays.findIndex(o => o.id === id);
      if (i !== -1) _overlays.splice(i, 1);
      if (_overlays.length === 0) _releaseGuard();
    };
  }, [isOpen]);
}

// ── Scroll lock ──────────────────────────────────────────────────────────────
// Nesting-safe: the outermost lock stores the page's real styles and restores
// them once, when the last overlay closes. A closing overlay can therefore never
// wipe another overlay's styles or leave the page frozen.

let _lockCount = 0;
let _savedScroll = null;
let _savedStyles = null;

function _lockScroll() {
  if (typeof document === 'undefined') return () => {};

  if (_lockCount === 0) {
    const body = document.body;
    const html = document.documentElement;
    _savedScroll = { x: window.scrollX, y: window.scrollY };
    _savedStyles = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    // position:fixed trick — required so iOS Safari does not scroll the page behind
    body.style.position = 'fixed';
    body.style.top = `-${_savedScroll.y}px`;
    body.style.left = `-${_savedScroll.x}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
  }
  _lockCount++;

  return () => {
    _lockCount = Math.max(0, _lockCount - 1);
    if (_lockCount > 0 || !_savedStyles) return;
    const body = document.body;
    const html = document.documentElement;
    body.style.position = _savedStyles.bodyPosition;
    body.style.top = _savedStyles.bodyTop;
    body.style.left = _savedStyles.bodyLeft;
    body.style.width = _savedStyles.bodyWidth;
    body.style.overflow = _savedStyles.bodyOverflow;
    html.style.overflow = _savedStyles.htmlOverflow;
    const { x, y } = _savedScroll;
    _savedScroll = null;
    _savedStyles = null;
    window.scrollTo(x, y);
  };
}

/**
 * Overlay hook that additionally locks background scroll while open.
 *
 * @param {boolean} isOpen - Whether the overlay is open
 * @param {Function} onClose - Callback to close the overlay
 */
export function useBackButtonClose(isOpen, onClose) {
  useBackButtonOverlay(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    return _lockScroll();
  }, [isOpen]);
}