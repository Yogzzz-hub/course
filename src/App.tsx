import { useEffect, useRef, Component, lazy, Suspense, type ReactNode, type ComponentType } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Header, Footer } from './components/layout';
import { MotionProvider, MotionDirector } from './components/MotionSystem';
const pageLoaders: Record<string, () => Promise<{ default: ComponentType }>> = {
 '/': () => import('./pages/Home'),
 '/programmes': () => import('./pages/Programmes'),
 '/programmes/python-full-stack': () => import('./pages/ProgrammeDetails'),
 '/learning-experience': () => import('./pages/LearningExperience'),
 '/career-support': () => import('./pages/CareerSupport'),
 '/about': () => import('./pages/About'),
 '/book-session': () => import('./pages/BookSession'),
 '/contact': () => import('./pages/Contact'),
 '/privacy-policy': () => import('./pages/Legal'),
 '/terms-and-conditions': () => import('./pages/Legal'),
 '*': () => import('./pages/NotFound'),
};
const pageComponents = Object.entries(pageLoaders).map(([path, loader]) => ({path, Page: lazy(loader)}));
export async function loadInitialPage(path: string) { return (await (pageLoaders[path] || pageLoaders['*'])()).default; }
import { academy } from './config/academy';
import { routes } from './data/routes';

function RouteEffects() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    const route = routes.find(route=>route.path===pathname);
    document.title = `${route?.title || 'Page not found'} | ${academy.name}`;
    const meta = (name:string, value:string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!element) {element=document.createElement('meta');element.setAttribute(attr,name);document.head.append(element);}
      element.content=value;
    };
    const description=route?.description || 'Find your way back to programme information and academy guidance.';
    meta('description',description);meta('og:title',document.title,true);meta('og:description',description,true);meta('og:type','website',true);
    meta('robots',!academy.siteUrl || !academy.legalApproved || !academy.brandApproved || !route || pathname.includes('policy') || pathname.includes('terms') ? 'noindex, nofollow' : 'index, follow');
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if(academy.siteUrl && route){ if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);} canonical.href=academy.siteUrl+pathname;meta('og:url',canonical.href,true); }else{canonical?.remove();}
    document.querySelector('#academy-structured-data')?.remove();
    if (academy.siteUrl && academy.brandApproved) {const script=document.createElement('script');script.type='application/ld+json';script.id='academy-structured-data';script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:document.title,url:academy.siteUrl+pathname,description});document.head.append(script);}
    if(hash){requestAnimationFrame(()=>document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());}
    else {window.scrollTo({top:0,behavior:'instant'});if (!firstRender.current) document.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});}
    firstRender.current = false;
  },[pathname,hash]);
  return <MotionDirector/>;
}
class PageErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){if(this.state.failed)return <section className="container page-hero"><h1>Something didn't load.</h1><p>Please reload the page to try again.</p><button className="button button-primary" onClick={()=>window.location.reload()}>Reload page</button></section>;return this.props.children;}
}
export default function App({initialPage: InitialPage, initialPath}: {initialPage?: ComponentType; initialPath?: string}) {
 return <MotionConfig reducedMotion="user"><MotionProvider><Header/><main id="main" tabIndex={-1}><PageErrorBoundary><Suspense fallback={<div className="container page-hero" role="status">Loading your next step…</div>}><Routes>{pageComponents.map(({path, Page}) => <Route key={path} path={path} element={InitialPage && (path === initialPath || (path === '*' && initialPath && !pageLoaders[initialPath])) ? <InitialPage/> : <Page/>}/>)}</Routes><RouteEffects/></Suspense></PageErrorBoundary></main><Footer/></MotionProvider></MotionConfig>;
}
