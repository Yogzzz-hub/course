import { useEffect, useRef, Component, lazy, Suspense, type ReactNode, type ComponentType } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Header, Footer } from './components/layout';
import { MotionProvider, MotionDirector } from './components/MotionSystem';
import { AmbientLayer, InteractionDirector } from './components/fx';
import { landingPaths } from './data/landingPages';
import { ConsentBanner } from './components/platform/ui';
const pageLoaders: Record<string, () => Promise<{ default: ComponentType }>> = {
 '/': () => import('./pages/Home'),
 '/programmes': () => import('./pages/Programmes'),
 '/programmes/python-full-stack': () => import('./pages/ProgrammeDetails'),
 '/programmes/full-stack-app-dev': () => import('./pages/ProgrammeDetails'),
 '/programmes/django-backend-dev': () => import('./pages/ProgrammeDetails'),
 '/programmes/react-development': () => import('./pages/ProgrammeDetails'),
 '/programmes/advanced-python': () => import('./pages/ProgrammeDetails'),
 '/programmes/devops-docker-deployment': () => import('./pages/ProgrammeDetails'),
 '/programmes/dsa-technical-interview': () => import('./pages/ProgrammeDetails'),
 '/programmes/programming-python-foundation': () => import('./pages/ProgrammeDetails'),
 '/programmes/html-css-javascript': () => import('./pages/ProgrammeDetails'),
 '/programmes/sql-postgresql': () => import('./pages/ProgrammeDetails'),
 '/programmes/software-engineering-testing': () => import('./pages/ProgrammeDetails'),
 '/programmes/ai-assisted-development': () => import('./pages/ProgrammeDetails'),
 '/learning-experience': () => import('./pages/LearningExperience'),
 '/career-support': () => import('./pages/CareerSupport'),
 '/about': () => import('./pages/About'),
 '/book-session': () => import('./pages/BookSession'),
 '/direct-booking': () => import('./pages/DirectBooking'),
 '/student-panel': () => import('./pages/StudentPanel'),
 '/admin-panel': () => import('./pages/AdminPanel'),
 '/trainer-panel': () => import('./pages/TrainerPanel'),
 '/auth/sign-in': () => import('./pages/SignIn'),
 '/auth/admin/sign-in': () => import('./pages/SignIn'),
 '/contact': () => import('./pages/Contact'),
 '/skill-test': () => import('./pages/SkillTest'),
 '/coding-arena': () => import('./pages/CodingArena'),
 '/roadmap': () => import('./pages/Roadmap'),
 '/leaderboard': () => import('./pages/Leaderboard'),
 '/admin': () => import('./pages/AdminConsole'),
 '/privacy-choices': () => import('./pages/PrivacyChoices'),
 ...Object.fromEntries(landingPaths.map(path => [path, () => import('./pages/Landing')])),
 '/privacy-policy': () => import('./pages/Legal'),
 '/terms-and-conditions': () => import('./pages/Legal'),
 '*': () => import('./pages/NotFound'),
};
const pageComponents = Object.entries(pageLoaders).map(([path, loader]) => ({path, Page: lazy(loader)}));
export async function loadInitialPage(path: string) { return (await (pageLoaders[path] || pageLoaders['*'])()).default; }
import { pageMeta } from './seo';
import { track } from './analytics/events';

function RouteEffects() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    const page = pageMeta(pathname);
    document.title = page.title;
    const meta = (name:string, value:string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!element) {element=document.createElement('meta');element.setAttribute(attr,name);document.head.append(element);}
      element.content=value;
    };
    meta('description',page.description);meta('og:title',page.title,true);meta('og:description',page.description,true);meta('og:type','website',true);
    meta('robots',page.robots);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if(page.canonical){ if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);} canonical.href=page.canonical;meta('og:url',canonical.href,true); }else{canonical?.remove();}
    document.querySelector('#academy-structured-data')?.remove();
    if (page.structuredData) {const script=document.createElement('script');script.type='application/ld+json';script.id='academy-structured-data';script.textContent=JSON.stringify(page.structuredData);document.head.append(script);}
    track('page_view');
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
 const { pathname } = useLocation();
 if (['/student-panel', '/admin-panel', '/trainer-panel'].includes(pathname)) {
   const Page = pageComponents.find(page => page.path === pathname)!.Page;
   return <PageErrorBoundary><Suspense fallback={<main className="container page-hero" role="status">Loading your workspace…</main>}>{InitialPage && initialPath === pathname ? <InitialPage/> : <Page/>}<RouteEffects/></Suspense></PageErrorBoundary>;
 }
 // The homepage and booking routes render their own header so the call-to-action can scroll in-page.
 if (['/', '/book-session', '/direct-booking'].includes(pathname)) {
   const Page = pageComponents.find(page => page.path === pathname)!.Page;
   return <MotionConfig reducedMotion="user"><MotionProvider><AmbientLayer/><InteractionDirector/><PageErrorBoundary><Suspense fallback={<main className="container page-hero" role="status">Loading counselling…</main>}>{InitialPage && initialPath === pathname ? <InitialPage/> : <Page/>}<RouteEffects/></Suspense></PageErrorBoundary><ConsentBanner/></MotionProvider></MotionConfig>;
 }
 return <MotionConfig reducedMotion="user"><MotionProvider><AmbientLayer/><InteractionDirector/><Header/><main id="main" tabIndex={-1}><PageErrorBoundary><Suspense fallback={<div className="container page-hero" role="status">Loading your next step…</div>}><Routes>{pageComponents.map(({path, Page}) => <Route key={path} path={path} element={InitialPage && (path === initialPath || (path === '*' && initialPath && !pageLoaders[initialPath])) ? <InitialPage/> : <Page/>}/>)}</Routes><RouteEffects/></Suspense></PageErrorBoundary></main><Footer/><ConsentBanner/></MotionProvider></MotionConfig>;
}
