import { programmes } from './data.ts';

const payload = {
  programmes,
};

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET() {
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

interface NodeServerResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

export default async function handler(_req?: unknown, res?: unknown) {
  if (res && typeof (res as NodeServerResponse).status === 'function') {
    const nodeRes = res as NodeServerResponse;
    nodeRes.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    nodeRes.setHeader('X-Content-Type-Options', 'nosniff');
    return nodeRes.status(200).json(payload);
  }
  return new Response(JSON.stringify(payload), { status: 200, headers });
}
