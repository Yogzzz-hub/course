import { afterEach, describe, expect, it, vi } from 'vitest';
import { learningApi } from '../src/components/learning/client';
afterEach(()=>vi.unstubAllGlobals());
describe('Learning service recovery messages',()=>{
  it('reports connection loss without claiming a submitted answer failed',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(learningApi('/attempts/a/answer',{option:1})).rejects.toThrow('may already be saved');
  });
  it('handles a proxy outage, invalid JSON and null data',async()=>{
    for(const body of ['', '<html>unavailable</html>', 'null']){
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body,{status:503})));
      await expect(learningApi('/session')).rejects.toThrow(/learning service/);
    }
  });
  it('preserves actionable server errors and does not retry mutations automatically',async()=>{
    const transport=vi.fn().mockResolvedValue(Response.json({message:'Refresh this page before trying again.'},{status:403}));
    vi.stubGlobal('fetch',transport);
    await expect(learningApi('/attempts',{track:1})).rejects.toThrow('Refresh this page');
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
