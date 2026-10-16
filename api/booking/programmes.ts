import { allBookingProgrammes } from '../../src/data/bookingProgrammes';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

const payload = {
  programmes: allBookingProgrammes,
};

export async function GET() {
  return json(payload);
}

export default async function handler(request: Request) {
  if (request.method && request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  return json(payload);
}
