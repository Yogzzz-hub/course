import { useLocation, useSearchParams } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import { PageHero, Button } from '../components/ui';

const subscribeHydration = () => () => {};

export default function SignInPage() {
  const admin = useLocation().pathname === '/auth/admin/sign-in';
  const [search] = useSearchParams();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  let returnTo = admin ? '/admin-panel' : '/student-panel';
  try {
    const candidate = new URL(search.get('returnTo') || '', 'https://academy.invalid');
    if (hydrated && !admin && candidate.origin === 'https://academy.invalid' && candidate.pathname === '/student-panel') {
      const packageId = requestedCheckoutPackage(candidate.searchParams);
      if (packageId) returnTo = checkoutHref(packageId);
    }
  } catch {
    /* Keep the fixed workspace destination for invalid input. */
  }

  const loginTarget = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <PageHero
      labels={['Secure', 'Access']}
      title={admin ? 'Admin sign-in' : 'Student sign-in'}
      description="The central authentication portal manages academy access securely."
    >
      <div className="hero-actions">
        <Button to={loginTarget}>Proceed to Sign In</Button>
        <Button to={returnTo} secondary>Return to workspace</Button>
        <Button to="/contact" secondary>Contact the academy</Button>
      </div>
    </PageHero>
  );
}
