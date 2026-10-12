import { useLocation, useSearchParams } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import { PageHero, Button } from '../components/ui';
const subscribeHydration = () => () => {};

/** Provider-owned authentication is configured separately; never collect credentials here. */
export default function SignInPage() {
  const admin = useLocation().pathname === '/auth/admin/sign-in';
  const [search] = useSearchParams();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  let returnTo = admin ? '/admin-panel' : '/student-panel';
  try {
    const candidate = new URL(search.get('returnTo') || '', 'https://academy.invalid');
    // Static HTML has no query parameters; update the link after hydration.
    if (hydrated && !admin && candidate.origin === 'https://academy.invalid' && candidate.pathname === '/student-panel') {
      const packageId = requestedCheckoutPackage(candidate.searchParams);
      if (packageId) returnTo = checkoutHref(packageId);
    }
  } catch { /* Keep the fixed workspace destination for invalid input. */ }
  return <PageHero eyebrow="ACCOUNT ACCESS" title={admin ? 'Admin sign-in' : 'Student sign-in'} description="The authentication service has not been connected to this website yet. Contact the academy for account access."><div className="hero-actions"><Button to={returnTo}>Return to workspace</Button><Button to="/contact" secondary>Contact the academy</Button></div></PageHero>;
}
