const getEnv = (key: string, fallback = '') => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || fallback;
  }
  return fallback;
};

function approvedUrl(value: string | undefined, host?: string) {
  if (!value) return '';
  try { const url = new URL(value); return url.protocol === 'https:' && (!host || url.hostname === host) ? url.href.replace(/\/$/, '') : ''; } catch { return ''; }
}

export const academy = {
  name: getEnv('ACADEMY_NAME', 'Aintrix Academy'),
  brandApproved: true,
  legalApproved: true,
  siteUrl: approvedUrl(getEnv('APP_URL', 'https://course.yogalakshmibaskar20.workers.dev')),
  email: getEnv('CONTACT_EMAIL', 'aintrixacademy2026@gmail.com'),
  receiverEmail: 'aintrixacademy2026@gmail.com',
  phone: getEnv('CONTACT_PHONE', '+91 98765 43210'),
  calendlyUrl: '',
  tagline: 'LEARN. BUILD. EVOLVE.',
  address: '93/50, Ramakrishna mutt road, Mandaveli, Chennai - 600028',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ryzeworks,+93%2F50,+Ramakrishna+Mutt+Rd,+Mandaveli,+Chennai+-+600028',
  googleMapsEmbedUrl: 'https://maps.google.com/maps?q=93%2F50%2C+Ramakrishna+mutt+road%2C+Mandaveli%2C+chennai-600028&t=&z=16&ie=UTF8&iwloc=&output=embed',
  legalEntity: 'Aintrix Academy Pvt Ltd',
  socialProfiles: [],
  deliveryMode: 'Hybrid / Interactive Online',
  classTimings: 'Flexible Weekday & Weekend Cohorts',
  prerequisites: 'Foundational logical thinking & commitment to learn',
  counsellingDuration: '30 mins',
  internshipConditions: 'Merit-based completion of capstone project',
  refundTerms: '100% money-back guarantee within 7 days of cohort launch',
  taxes: 'Inclusive of GST',
  paymentSchedule: 'Flexible monthly installments & upfront scholar discounts',
  source: 'Aintrix Academy Programme Catalogue & Specifications.',
} as const;
