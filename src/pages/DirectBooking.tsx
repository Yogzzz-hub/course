import { PublicWebsite, createHttpBookingApi, type Programme } from '../components/public-booking';
import { programme, packages } from '../data/programmes';
import { useLocation, useSearchParams } from 'react-router-dom';

const api = createHttpBookingApi(import.meta.env.VITE_BOOKING_API_URL || '/api/booking');
// Existing, brief-derived catalogue snapshot. A connected CMS replaces it on refresh.
const initialProgrammes: Programme[] = [{
  id: 'python-full-stack', title: programme.name, summary: programme.description,
  duration: programme.duration, currency: 'INR', technologies: programme.technologies,
  packages: packages.map(tier => ({ id: tier.name.toLowerCase(), name: tier.name, priceMinor: tier.price * 100, inclusions: tier.inclusions.map(label => ({ label, included: true })) })),
  addons: [],
  feeDisclosure: 'Listed fees from the supplied programme brief. Taxes, payment schedules, refunds, and exact package scope require academy confirmation. Internships depend on eligibility and availability; no internship or job is guaranteed.',
}];

export default function DirectBooking() {
  const { pathname } = useLocation();
  const [search] = useSearchParams();
  return <PublicWebsite api={api} initialProgrammes={initialProgrammes} startAtBooking={pathname !== '/'} initialPackageId={search.get('package') ?? undefined}/>;
}
