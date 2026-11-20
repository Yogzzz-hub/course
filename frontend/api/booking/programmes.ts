import { programmes } from './data.ts';

const payload = {
  programmes,
};

interface NodeServerResponse {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  status?(code: number): { json(body: unknown): void; end(): void };
  end?(body?: string): void;
}

export default function handler(_req?: unknown, res?: unknown) {
  if (res && typeof (res as NodeServerResponse).setHeader === 'function') {
    const nodeRes = res as NodeServerResponse;
    nodeRes.setHeader('Content-Type', 'application/json');
    nodeRes.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    nodeRes.setHeader('X-Content-Type-Options', 'nosniff');
    if (typeof nodeRes.status === 'function') {
      return nodeRes.status(200).json(payload);
    }
    nodeRes.statusCode = 200;
    nodeRes.end?.(JSON.stringify(payload));
    return;
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET = handler;
export const POST = handler;
