import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App, { loadInitialPage } from './App';
import { academy } from './config/academy';
import { routes } from './data/routes';
import { pageMeta } from './seo';
export { routes, academy };
export { robotsTxt, sitemapXml, sitemapPaths } from './seo';
export { landingPaths } from './data/landingPages';
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export async function render(path:string){
 const page=pageMeta(path);
 const canonical=page.canonical ? `<link rel="canonical" href="${escape(page.canonical)}"/><meta property="og:url" content="${escape(page.canonical)}"/>` : '';
 const structured=page.structuredData ? `<script id="academy-structured-data" type="application/ld+json">${JSON.stringify(page.structuredData).replace(/</g,'\\u003c')}</script>` : '';
 // Match the client's resolved route and avoid deferred streaming fragments in static HTML.
 const initialPage = await loadInitialPage(path);
 const html = renderToString(<StaticRouter location={path}><App initialPage={initialPage} initialPath={path}/></StaticRouter>);
 return { html,head:`<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"/><meta name="robots" content="${page.robots}"/><meta property="og:title" content="${escape(page.title)}"/><meta property="og:description" content="${escape(page.description)}"/><meta property="og:type" content="website"/><meta name="twitter:card" content="summary"/>${canonical}${structured}`};
}
