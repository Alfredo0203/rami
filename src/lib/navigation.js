// Decides whether the visual back button can go back.
//
// React Router keeps the index of the current history entry in
// window.history.state.idx. That is the only reliable source: modal "guard"
// entries, payment redirects and full page reloads make a hand-kept counter
// drift, and the back button ends up firing a history move that lands on the
// very same URL — the page looks frozen.
let _navDepth = 0;

const GUARD_KEY = 'appOverlayGuard';

function currentIndex() {
  if (typeof window === 'undefined') return 0;
  const state = window.history.state;
  // A leftover overlay-guard entry carries no router index: going back from it
  // only re-renders the same URL.
  if (!state || state[GUARD_KEY]) return 0;
  if (typeof state.idx === 'number') return state.idx;
  return _navDepth;
}

export function trackNavigation(type) {
  if (type === 'PUSH') _navDepth++;
  else if (type === 'POP') _navDepth = Math.max(0, _navDepth - 1);
}

export function canGoBack() {
  return currentIndex() > 0;
}

export function goBack(navigate, fallback = '/') {
  if (canGoBack()) {
    navigate(-1);
  } else {
    // Use REPLACE so we don't add a new history entry — otherwise the user
    // could bounce between the fallback page and the current page forever.
    navigate(fallback, { replace: true });
  }
}