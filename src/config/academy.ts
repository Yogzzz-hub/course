const env = import.meta.env;
function approvedUrl(value: string | undefined, host?: string) {
  if (!value) return '';
  try { const url = new URL(value); return url.protocol === 'https:' && (!host || url.hostname === host) ? url.href.replace(/\/$/, '') : ''; } catch { return ''; }
}
export const academy = {
  name: env.VITE_ACADEMY_NAME || 'Academy',
  brandApproved: env.VITE_BRAND_APPROVED === 'true',
  legalApproved: env.VITE_LEGAL_APPROVED === 'true',
  siteUrl: approvedUrl(env.VITE_SITE_URL),
  email: env.VITE_CONTACT_EMAIL || '',
  phone: env.VITE_CONTACT_PHONE || '',
  calendlyUrl: approvedUrl(env.VITE_CALENDLY_URL, 'calendly.com'),
  tagline: 'LEARN. BUILD. EVOLVE.',
  // Unknown business facts stay unknown. Populate only after academy approval.
  legalEntity: null, address: null, socialProfiles: [], deliveryMode: null,
  classTimings: null, prerequisites: null, counsellingDuration: null,
  internshipConditions: null, refundTerms: null, taxes: null, paymentSchedule: null,
  source: 'User-supplied build brief. Academy!.pdf was not supplied.',
} as const;
