import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import './styles/global.css';
import './styles/animations.css';
import './styles/experience.css';
import './styles/portal.css';
// Keep discovery layouts available before lazy route hydration and navigation.
import './components/learning/learning.css';
import './components/learning/assessment.css';
import App, { loadInitialPage } from './App';
if (window.location.pathname.length > 1 && window.location.pathname.endsWith('/')) {
  window.history.replaceState(null, '', window.location.pathname.replace(/\/+$/, '') + window.location.search + window.location.hash);
}
const root=document.getElementById('root')!;
// Resolve the initial route before hydration so a lazy boundary never replaces static content.
loadInitialPage(window.location.pathname).then(initialPage => {
  const app=<BrowserRouter><App initialPage={initialPage} initialPath={window.location.pathname}/></BrowserRouter>;
  if(root.querySelector('main')) hydrateRoot(root,app);else createRoot(root).render(app);
}).catch(() => {
  const notice=document.createElement('p');
  notice.className='notice container';
  notice.setAttribute('role','alert');
  notice.textContent='Interactive features could not load. Please refresh to try again; programme information remains available below.';
  root.prepend(notice);
});
