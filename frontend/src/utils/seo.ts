export const privatePaths = [
  '/assessment',
  '/shared-roadmap',
  '/admin',
  '/signup',
  '/login',
  '/app',
  '/trainer',
  '/manager',
  '/finance',
  '/superadmin',
];
export function isPrivatePath(path:string){return privatePaths.some(base=>path===base || path.startsWith(base+'/'));}
