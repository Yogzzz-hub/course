import { afterEach, describe, expect, it, vi } from 'vitest';
const createApp=vi.hoisted(()=>vi.fn());
vi.mock('../server/app.ts',()=>({createApp}));
vi.mock('../server/db.ts',()=>({pool:{}}));
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();vi.resetModules();createApp.mockReset();});
describe('Hosted learning adapter',()=>{
  it('preserves the request URL and trusted peer while reusing the initialized app',async()=>{
    vi.stubEnv('DATABASE_URL','test');vi.stubEnv('APP_ORIGIN','https://academy.example');
    const handle=vi.fn().mockImplementation(async()=>Response.json({status:'ok'}));
    createApp.mockReturnValue(handle);
    const {default:adapter}=await import('../api/learning');
    const request=new Request('https://academy.example/api/learning/health',{headers:{'x-vercel-forwarded-for':'192.0.2.1, 192.0.2.2'}});
    expect((await adapter.fetch(request)).status).toBe(200);
    await adapter.fetch(request);
    expect(createApp).toHaveBeenCalledTimes(1);expect(createApp.mock.calls[0].slice(1)).toEqual(['https://academy.example',true]);
    expect(handle).toHaveBeenCalledWith(request,'192.0.2.1');
  });
  it('returns a private JSON 503 before backend initialization when configuration is missing',async()=>{
    vi.stubEnv('DATABASE_URL','');
    const {default:adapter}=await import('../api/learning');
    const response=await adapter.fetch(new Request('https://academy.example/api/learning/session'));
    expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
    expect(createApp).not.toHaveBeenCalled();
  });
  it.each(['invalid','http://academy.example','https://academy.example/path'])('rejects invalid hosted origin %s',async origin=>{
    vi.stubEnv('DATABASE_URL','test');vi.stubEnv('APP_ORIGIN',origin);
    const {default:adapter}=await import('../api/learning');
    expect((await adapter.fetch(new Request('https://academy.example/api/learning/health'))).status).toBe(503);
    expect(createApp).not.toHaveBeenCalled();
  });
  it('contains initialization errors and emits a correlatable log without secrets',async()=>{
    vi.stubEnv('DATABASE_URL','test');vi.stubEnv('APP_ORIGIN','https://academy.example');
    createApp.mockImplementation(()=>{throw new Error('private connection details');});
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    const {default:adapter}=await import('../api/learning');
    const response=await adapter.fetch(new Request('https://academy.example/api/learning/health'));
    const body=await response.json();expect(response.status).toBe(503);expect(body.requestId).toBeTruthy();
    expect(log.mock.calls[0][0]).toContain(body.requestId);expect(JSON.stringify(log.mock.calls)).not.toContain('private connection');
  });
});
