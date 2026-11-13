import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import { PageHero, Button } from '../components/ui';
const subscribeHydration = () => () => {};

export default function SignInPage() {
  const navigate = useNavigate();
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
  } catch { /* Keep the fixed workspace destination for invalid input. */ }

  const loginTarget = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    navigate(loginTarget, { replace: true });
  }, [navigate, loginTarget]);

  return (
    <PageHero
      labels={['Secure', 'Access']}
      title={admin ? 'Admin sign-in' : 'Student sign-in'}
      description="Redirecting to the central authentication portal..."
    >
      <div className="hero-actions">
        <Button to={loginTarget}>Proceed to Sign In</Button>
        <Button to="/contact" secondary>Contact the academy</Button>
      </div>
    </PageHero>
  );
}
