export type Enquiry = { name: string; email: string; phone: string; programme: string; contactMethod: string; message: string; consent: boolean; website: string };
export type EnquiryErrors = Partial<Record<keyof Enquiry, string>>;
export const emptyEnquiry: Enquiry = { name: '', email: '', phone: '', programme: 'python-full-stack', contactMethod: 'email', message: '', consent: false, website: '' };
export function validateEnquiry(data: Enquiry): EnquiryErrors {
  const errors: EnquiryErrors = {};
  if (!data.name.trim() || data.name.trim().length < 2 || data.name.length > 100) errors.name = 'Enter your name (2–100 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) errors.email = 'Enter a valid email address.';
  if ((data.contactMethod === 'phone' && !data.phone) || (data.phone && (!/^[+\d\s()-]{7,25}$/.test(data.phone) || data.phone.replace(/\D/g,'').length < 7))) errors.phone = 'Enter a valid phone number, including country code.';
  if (!data.programme) errors.programme = 'Choose a programme.';
  if (!['email', 'phone'].includes(data.contactMethod)) errors.contactMethod = 'Choose email or phone.';
  if (data.message.length > 2000) errors.message = 'Keep your message under 2,000 characters.';
  if (!data.consent) errors.consent = 'Please confirm that the academy may respond to your enquiry.';
  return errors;
}
