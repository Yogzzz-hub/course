// Run before first paint under the site's self-only script policy.
try {
  const theme = localStorage.getItem('academy-theme');
  const motion = localStorage.getItem('academy-motion');
  document.documentElement.dataset.theme = /^theme-[1-4]$/.test(theme || '') ? theme : 'theme-1';
  document.documentElement.dataset.motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || motion === 'paused' ? 'paused' : 'active';
} catch {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.dataset.motion = 'paused';
}
