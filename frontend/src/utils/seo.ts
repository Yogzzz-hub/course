export const privatePaths = ['/assessment','/shared-roadmap','/admin','/signup'];
export function isPrivatePath(path:string){return privatePaths.some(base=>path===base || path.startsWith(base+'/'));}
