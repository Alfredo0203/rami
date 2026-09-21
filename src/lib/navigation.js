// Tracks how many PUSH navigations the user has made from the initial load.
// Used to determine if there's a previous page to go back to.
// The hardware/visual back button should go back if _navDepth > 0, else go Home.
let _navDepth = 0;

export function trackNavigation(type) {
  if (type === 'PUSH') _navDepth++;
  else if (type === 'POP') _navDepth = Math.max(0, _navDepth - 1);
}

export function canGoBack() {
  return _navDepth > 0;
}

export function goBack(navigate, fallback = '/') {
  if (_navDepth > 0) {
    navigate(-1);
  } else {
    navigate(fallback);
  }
}