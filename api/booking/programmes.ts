import { programme, packages } from '../../src/data/programmes';

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
  programmes: [
    {
      id: 'python-full-stack',
      title: programme.name,
      summary: programme.description,
      duration: programme.duration,
      currency: 'INR',
      technologies: programme.technologies,
      packages: packages.map(tier => ({
        id: tier.name.toLowerCase(),
        name: tier.name,
        priceMinor: tier.price * 100,
        inclusions: tier.inclusions.map(label => ({ label, included: true })),
      })),
      addons: [],
      feeDisclosure:
        'Listed fees from the supplied programme brief. Taxes, payment schedules, refunds, and exact package scope require academy confirmation.',
    },
  ],
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
