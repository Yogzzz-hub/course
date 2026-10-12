import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App, { loadInitialPage } from './App';
import { academy } from './config/academy';
import { routes } from './data/routes';
export { routes, academy };
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export async function render(path:string){
 const route=routes.find(r=>r.path===path);
 const title=`${route?.title || 'Page not found'} | ${academy.name}`;
 const description=route?.description || 'Find your way back to the academy.';
 const launchReady=academy.siteUrl && academy.brandApproved && academy.legalApproved;
 const noindex=!launchReady || !route || path.includes('policy') || path.includes('terms');
 const canonical=academy.siteUrl && route ? `<link rel="canonical" href="${escape(academy.siteUrl+path)}"/><meta property="og:url" content="${escape(academy.siteUrl+path)}"/>` : '';
 const structured=academy.siteUrl && academy.brandApproved && route ? `<script id="academy-structured-data" type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title,url:academy.siteUrl+path,description}).replace(/</g,'\\u003c')}</script>` : '';
 // Match the client's resolved route and avoid deferred streaming fragments in static HTML.
 const initialPage = await loadInitialPage(path);
 const html = renderToString(<StaticRouter location={path}><App initialPage={initialPage} initialPath={path}/></StaticRouter>);
 return { html,head:`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"/><meta name="robots" content="${noindex?'noindex, nofollow':'index, follow'}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:type" content="website"/><meta name="twitter:card" content="summary"/>${canonical}${structured}`};
}
