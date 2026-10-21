import { academy } from './config/academy';
import { landingFor } from './data/landingPages';
import { detailedProgrammes } from './data/programmeCatalog';
import { routes } from './data/routes';

/**
 * One place for search metadata. Private workspaces never get indexed, never enter the sitemap and
 * never carry structured data. Public pages become indexable only once the domain, brand and legal
 * text are approved (see src/config/academy.ts).
 */
export const privatePaths = ['/student-panel', '/admin-panel', '/trainer-panel', '/admin', '/auth/sign-in', '/auth/admin/sign-in'];
/** Public but kept out of search: drafts and preference pages. */
export const unlistedPaths = ['/privacy-policy', '/terms-and-conditions', '/privacy-choices'];

export const launchReady = () => !!(academy.siteUrl && academy.brandApproved && academy.legalApproved);
export const isPrivate = (path: string) => privatePaths.includes(path);
export const routeFor = (path: string) => routes.find(route => route.path === path);
export function isIndexable(path: string) {
  return !!routeFor(path) && launchReady() && !isPrivate(path) && !unlistedPaths.includes(path);
}

export function titleFor(path: string) {
  const route = routeFor(path);
  const brand = ['/', '/book-session', '/direct-booking'].includes(path) ? 'Technical Academy' : academy.name;
  return `${route?.title || 'Page not found'} | ${brand}`;
}

type Crumb = { name: string; path: string };
export function breadcrumbsFor(path: string): Crumb[] {
  const programme = detailedProgrammes.find(item => item.slug === path);
  if (programme) return [{ name: 'Home', path: '/' }, { name: 'Programmes', path: '/programmes' }, { name: programme.name, path }];
  const landing = landingFor(path);
  if (landing) return [{ name: 'Home', path: '/' }, { name: landing.title, path }];
  return [];
}

export interface PageMeta { title: string; description: string; robots: string; canonical: string | null; structuredData: Record<string, unknown> | null }

export function pageMeta(path: string): PageMeta {
  const route = routeFor(path);
  const title = titleFor(path);
  const description = route?.description || 'Find your way back to programme information and academy guidance.';
  const canonical = academy.siteUrl && route && !isPrivate(path) ? academy.siteUrl + path : null;
  let structuredData: PageMeta['structuredData'] = null;
  if (academy.siteUrl && academy.brandApproved && route && !isPrivate(path)) {
    const graph: Record<string, unknown>[] = [{ '@type': 'WebPage', name: title, url: academy.siteUrl + path, description }];
    const crumbs = breadcrumbsFor(path);
    if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: academy.siteUrl + crumb.path })) });
    const landing = landingFor(path);
    // FAQ markup only describes questions that are visibly answered on the page.
    if (landing?.faqs.length) graph.push({ '@type': 'FAQPage', mainEntity: landing.faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) });
    structuredData = { '@context': 'https://schema.org', '@graph': graph };
  }
  return { title, description, robots: isIndexable(path) ? 'index, follow' : 'noindex, nofollow', canonical, structuredData };
}

export const sitemapPaths = () => routes.map(route => route.path).filter(isIndexable);
export function robotsTxt() {
  if (!launchReady()) return 'User-agent: *\nDisallow: /\n';
  return ['User-agent: *', 'Allow: /', 'Disallow: /api/', ...privatePaths.map(path => `Disallow: ${path}`), `Sitemap: ${academy.siteUrl}/sitemap.xml`, ''].join('\n');
}
export function sitemapXml() {
  const urls = sitemapPaths().map(path => `<url><loc>${(academy.siteUrl + path).replace(/&/g, '&amp;')}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
