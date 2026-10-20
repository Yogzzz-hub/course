const env = import.meta.env;
function approvedUrl(value: string | undefined, host?: string) {
  if (!value) return '';
  try { const url = new URL(value); return url.protocol === 'https:' && (!host || url.hostname === host) ? url.href.replace(/\/$/, '') : ''; } catch { return ''; }
}
export const academy = {
  name: env.VITE_ACADEMY_NAME || 'Aintrix Academy',
  brandApproved: env.VITE_BRAND_APPROVED === 'true',
  legalApproved: env.VITE_LEGAL_APPROVED === 'true',
  siteUrl: approvedUrl(env.VITE_SITE_URL),
  email: env.VITE_CONTACT_EMAIL || 'aintrixacademy2026@gmail.com',
  receiverEmail: 'aintrixacademy2026@gmail.com',
  phone: env.VITE_CONTACT_PHONE || '',
  calendlyUrl: approvedUrl(env.VITE_CALENDLY_URL, 'calendly.com'),
  tagline: 'LEARN. BUILD. EVOLVE.',
  address: '93/50, Ramakrishna mutt road, Mandaveli, Chennai - 600028',
  googleMapsUrl: env.VITE_GOOGLE_MAPS_URL || 'https://www.google.com/maps/search/?api=1&query=Ryzeworks,+93%2F50,+Ramakrishna+Mutt+Rd,+Mandaveli,+Chennai+-+600028',
  googleMapsEmbedUrl: 'https://maps.google.com/maps?q=93%2F50%2C+Ramakrishna+mutt+road%2C+Mandaveli%2C+chennai-600028&t=&z=16&ie=UTF8&iwloc=&output=embed',
  // Unknown business facts stay unknown. Populate only after academy approval.
  legalEntity: null, socialProfiles: [], deliveryMode: null,
  classTimings: null, prerequisites: null, counsellingDuration: null,
  internshipConditions: null, refundTerms: null, taxes: null, paymentSchedule: null,
  source: 'Aintrix Academy Programme Catalogue & Specifications.',
} as const;
