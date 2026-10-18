export const privatePaths = ['/assessment','/shared-roadmap','/admin','/student-panel','/admin-panel','/auth/sign-in','/auth/admin/sign-in'];
export function isPrivatePath(path:string){return privatePaths.some(base=>path===base || path.startsWith(base+'/'));}
