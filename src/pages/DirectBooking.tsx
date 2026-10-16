import { PublicWebsite, createHttpBookingApi } from '../components/public-booking';
import { allBookingProgrammes } from '../data/bookingProgrammes';
import { useLocation, useSearchParams } from 'react-router-dom';

const api = createHttpBookingApi(import.meta.env.VITE_BOOKING_API_URL || '/api/booking');
const initialProgrammes = allBookingProgrammes;

export default function DirectBooking() {
  const { pathname } = useLocation();
  const [search] = useSearchParams();
  return <PublicWebsite api={api} initialProgrammes={initialProgrammes} startAtBooking={pathname !== '/'} initialPackageId={search.get('package') ?? undefined}/>;
}
